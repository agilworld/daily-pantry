import app from "./index";
import { createDb, roles } from "@dailypantry/shared";
import { sql } from "drizzle-orm";

async function ensureDatabase() {
  const db = createDb();

  // Check if roles table has data
  const result = await db.select({ count: sql<number>`count(*)` }).from(roles);
  const hasData = result[0]?.count > 0;

  if (!hasData) {
    console.log("🔄 Running drizzle-kit push...");
    const push = Bun.spawnSync(["bunx", "drizzle-kit", "push"], {
      cwd: import.meta.dir,
      env: process.env,
    });
    if (push.exitCode !== 0) {
      console.error("❌ drizzle-kit push failed:", push.stderr.toString());
      process.exit(1);
    }
    console.log("✅ Tables created/updated");

    console.log("🌱 Running seed...");
    const { seed } = await import("./db/seed");
    await seed();
    console.log("✅ Roles seeded");
  } else {
    console.log("✅ Database already initialized");
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
