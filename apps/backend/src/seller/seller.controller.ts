import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sessions, users, roles } from "@dailypantry/shared";
import { eq, and, gt } from "drizzle-orm";
import { SellerRepository } from "./seller.repository";
import { SellerService } from "./seller.service";
import { updateProfileBodySchema } from "./seller.schema";
import type { Env } from "../types/env";
import type { DbClient } from "../middleware/db.middleware";

type Variables = {
  db: DbClient;
  currentUserId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: authenticate + seller role check
app.use("*", async (c, next) => {
  const token = getCookie(c, "dp_session");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");

  const rows = await db
    .select({ user_id: users.id, role_name: roles.name })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .innerJoin(roles, eq(users.role_id, roles.id))
    .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date().toISOString())))
    .limit(1);

  if (!rows.length) return c.json({ error: "Unauthorized" }, 401);
  if (rows[0].role_name !== "seller") return c.json({ error: "Forbidden" }, 403);

  c.set("currentUserId", rows[0].user_id);
  await next();
});

app.get("/profile", async (c) => {
  const db = c.get("db");
  const repo = new SellerRepository(db);
  const service = new SellerService(repo);

  const userId = c.get("currentUserId");
  const profile = await service.getProfile(userId);
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({ profile }, 200);
});

app.put("/profile", async (c) => {
  const db = c.get("db");
  const repo = new SellerRepository(db);
  const service = new SellerService(repo);

  const userId = c.get("currentUserId");
  const body = await c.req.json();
  const parsed = updateProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const updated = await service.updateProfile(userId, parsed.data);
  return c.json({ profile: updated }, 200);
});

export default app;
