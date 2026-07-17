import { createMiddleware } from "hono/factory";
import { createDb } from "@dailypantry/shared";
import type { Env } from "../types/env";

export type DbClient = ReturnType<typeof createDb>;

export const dbMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { db: DbClient };
}>(async (c, next) => {
  c.set("db", createDb(c.env));
  await next();
});
