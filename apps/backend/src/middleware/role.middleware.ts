import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { sessions, users, roles } from "@dailypantry/shared";
import { eq, and, gt } from "drizzle-orm";
import type { Env } from "../types/env";
import type { DbClient } from "./db.middleware";

/**
 * Middleware factory that authenticates the request and enforces a required role.
 *
 * Reads the `dp_session` cookie, validates the session against the database,
 * checks that the user has the required role, and sets `c.var.user` with
 * `{ id, role_name }` for downstream handlers.
 *
 * @param requiredRole - The role name required to access the route (e.g. "office_boy", "seller")
 * @returns Hono middleware
 */
export function roleGuard(requiredRole: string) {
  return createMiddleware<{
    Bindings: Env;
    Variables: { db: DbClient; user: { id: string; role_name: string } };
  }>(async (c, next) => {
    const token = getCookie(c, "dp_session");
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const db = c.get("db");

    const result = await db
      .select({ user_id: users.id, role_name: roles.name })
      .from(sessions)
      .innerJoin(users, eq(sessions.user_id, users.id))
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date().toISOString())))
      .limit(1);

    if (!result.length) return c.json({ error: "Unauthorized" }, 401);
    if (result[0].role_name !== requiredRole) return c.json({ error: "Forbidden" }, 403);

    c.set("user", { id: result[0].user_id, role_name: result[0].role_name });
    await next();
  });
}
