import app from "./index";
import { createDb, roles } from "@dailypantry/shared";
import { sql } from "drizzle-orm";

async function ensureDatabase() {
  const db = createDb();

  // Always push schema (idempotent — creates missing tables, preserves data)
  console.log("🔄 Syncing database schema...");
  // serve.ts lives in src/, but drizzle.config.ts is at the backend app root
  const backendRoot = import.meta.dir.replace(/[\\/]src$/, "");
  const push = Bun.spawnSync(["bunx", "drizzle-kit", "push"], {
    cwd: backendRoot,
    env: process.env,
  });
  if (push.exitCode !== 0) {
    console.error("❌ drizzle-kit push failed:", push.stderr.toString());
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
