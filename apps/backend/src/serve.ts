import app from "./index";
import { createDb, roles } from "@dailypantry/shared";
import { sql } from "drizzle-orm";
import { createClient } from "@libsql/client";

/**
 * Run `drizzle-kit push` non-interactively and wait for it to finish.
 *
 * drizzle-kit's push command is interactive: when it detects a column that was
 * removed AND a new column added in the same table it prompts
 * "Is <new> column in <table> table created or renamed from another column?"
 * (a rename-detection question that even `--force` does not skip), and it also
 * asks for confirmation before executing data-loss statements.
 *
 * In a non-TTY context (Bun.spawnSync with inherited stdin) the prompt never
 * resolves, so the process hangs and the server never starts. The prompt is a
 * hanji <Select> that submits on Enter (`\r`); the first option is always the
 * safe "create column" / "No, abort" choice, so we answer with a newline.
 * `--force` auto-approves any data-loss confirmation that follows.
 *
 * @throws {Error} If `drizzle-kit push` exits non-zero or reports a SQL error.
 */
async function pushSchema(): Promise<void> {
  // serve.ts lives in src/, but drizzle.config.ts is at the backend app root
  const backendRoot = import.meta.dir.replace(/[\\/]src$/, "");
  const proc = Bun.spawn(
    [Bun.which("bunx") ?? "bunx", "drizzle-kit", "push", "--force"],
    {
      cwd: backendRoot,
      env: process.env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    }
  );
  // Newline answers the rename-detection prompt with its default (safe) choice.
  proc.stdin?.write("\r");
  proc.stdin?.end();

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  // drizzle-kit 0.30.x sometimes swallows push failures: it prints the error to
  // stderr and still exits 0. Treat a SQL error as a failure so we don't start
  // a server against a half-migrated schema.
  const pushFailed =
    exitCode !== 0 ||
    /(LibsqlError|SQLITE_ERROR|SQL_INPUT_ERROR|no such column|error:)/i.test(stderr);

  if (pushFailed) {
    throw new Error(
      `drizzle-kit push failed (exit ${exitCode}):\n${stderr || stdout}`
    );
  }
  if (stdout.trim().length > 0) {
    console.log(stdout.trim().split("\n").slice(-6).join("\n"));
  }
  if (stderr.trim().length > 0) {
    console.error(stderr.trim());
  }
}

/**
 * Apply the destructive `meals.category` → `meals.category_id` migration manually.
 *
 * drizzle-kit 0.30.x cannot push this change: its table-rebuild generates
 * `INSERT INTO __new_meals (... category_id ...) SELECT ... category_id ... FROM meals`
 * which fails with "no such column: category_id" because the old table still has
 * `category`. We therefore rebuild the table by hand, mapping the old string
 * `category` values to NULL (the old nasi/mie/snack/minuman strings were the
 * wrong concept and are not meaningful for the new FK).
 *
 * Idempotent: does nothing when `category_id` already exists.
 *
 * @throws {Error} If the table rebuild fails.
 */
async function migrateMealsCategory(): Promise<void> {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    const tableExists = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meals'"
    );
    if (tableExists.rows.length === 0) {
      return; // fresh DB — push will create meals with the right shape
    }

    const cols = await client.execute("PRAGMA table_info(meals)");
    const names = cols.rows.map((row) => String(row.name));
    const hasCategory = names.includes("category");
    const hasCategoryId = names.includes("category_id");

    if (hasCategoryId) {
      return; // already migrated
    }

    if (!hasCategory) {
      throw new Error(
        "meals table has neither `category` nor `category_id` — cannot migrate automatically"
      );
    }

    console.log("🔄 Migrating meals.category -> meals.category_id...");
    // Rebuild `meals` with `category_id` (FK to categories). Old category strings
    // are dropped; the column is nullable, so existing rows keep working as
    // own-selling meals (category_id = NULL).
    const statements = [
      "PRAGMA foreign_keys=off",
      "BEGIN",
      `CREATE TABLE "__new_meals" (
        "id" text PRIMARY KEY NOT NULL,
        "seller_id" text NOT NULL,
        "name" text NOT NULL,
        "price_cents" integer NOT NULL,
        "description" text,
        "category_id" text,
        "is_active" integer DEFAULT true,
        "created_at" text DEFAULT (current_timestamp),
        "deleted_at" text,
        "updated_at" text,
        FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
        FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON UPDATE no action ON DELETE no action
      )`,
      `INSERT INTO "__new_meals"("id", "seller_id", "name", "price_cents", "description", "category_id", "is_active", "created_at", "deleted_at", "updated_at")
        SELECT "id", "seller_id", "name", "price_cents", "description", NULL, "is_active", "created_at", "deleted_at", "updated_at" FROM "meals"`,
      `DROP TABLE "meals"`,
      `ALTER TABLE "__new_meals" RENAME TO "meals"`,
      "COMMIT",
      "PRAGMA foreign_keys=on",
    ];
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log("✅ meals.category -> meals.category_id migrated");
  } finally {
    client.close();
  }
}

async function ensureDatabase() {
  const db = createDb();

  // Always push schema (idempotent — creates missing tables, preserves data)
  console.log("🔄 Syncing database schema...");
  try {
    // Destructive column changes (category -> category_id) cannot be applied by
    // `drizzle-kit push` (interactive prompt + broken table-rebuild SQL), so do
    // them first, then let push handle the remaining (safe) drift.
    await migrateMealsCategory();
    await pushSchema();
  } catch (err) {
    console.error("❌ drizzle-kit push failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
  console.log("✅ Schema synced");

  // Seed roles only if empty
  const result = await db.select({ count: sql<number>`count(*)` }).from(roles);
  const hasData = result[0]?.count > 0;
  if (!hasData) {
    console.log("🌱 Running seed...");
    const { seed } = await import("./db/seed");
    await seed();
    console.log("✅ Roles seeded");
  } else {
    console.log("✅ Roles already seeded");
  }
}

const port = parseInt(process.env.PORT || "3060");

// Wait for DB init, then start server
ensureDatabase().then(() => {
  console.log(`🚀 Server running on port ${port}`);
});

export default {
  fetch: app.fetch,
  port,
};
