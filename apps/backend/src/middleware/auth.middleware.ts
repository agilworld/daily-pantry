import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { sessions, users, roles } from "@dailypantry/shared";
import { eq, and, gt } from "drizzle-orm";
import type { Env } from "../types/env";
import type { DbClient } from "./db.middleware";

type Variables = {
  db: DbClient;
  user: {
    id: string;
    name: string;
    email: string;
    role_id: string;
    role_name: string;
  };
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const token = getCookie(c, "dp_session");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  const session = await db
    .select({ user: users, role: roles })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .innerJoin(roles, eq(users.role_id, roles.id))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expires_at, new Date().toISOString())
      )
    )
    .limit(1);

  if (!session.length) return c.json({ error: "Unauthorized" }, 401);

  const { password, ...userWithoutPassword } = session[0].user;
  c.set("user", {
    id: userWithoutPassword.id,
    name: userWithoutPassword.name,
    email: userWithoutPassword.email,
    role_id: userWithoutPassword.role_id ?? "",
    role_name: session[0].role.name,
  });
  await next();
});
