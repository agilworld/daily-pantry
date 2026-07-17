import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { loginBodySchema, registerBodySchema } from "./auth.schema";
import type { Env } from "../types/env";
import type { DbClient } from "../middleware/db.middleware";

const app = new Hono<{ Bindings: Env; Variables: { db: DbClient } }>();

app.post("/login", async (c) => {
  const db = c.get("db");
  const repo = new AuthRepository(db);
  const service = new AuthService(repo);

  const body = await c.req.json();
  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  try {
    const { user, token } = await service.login(parsed.data.email, parsed.data.password);

    setCookie(c, "dp_session", token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return c.json({ user }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    const status = message === "Invalid email or password" ? 401 : 400;
    return c.json({ error: message }, status);
  }
});

app.post("/register", async (c) => {
  const db = c.get("db");
  const repo = new AuthRepository(db);
  const service = new AuthService(repo);

  const body = await c.req.json();
  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  try {
    const user = await service.register(parsed.data);
    return c.json({ user }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    const status = message === "Email already registered" ? 409 : 400;
    return c.json({ error: message }, status);
  }
});

app.post("/logout", async (c) => {
  const token = getCookie(c, "dp_session");
  if (token) {
    const db = c.get("db");
    const repo = new AuthRepository(db);
    const service = new AuthService(repo);
    await service.logout(token);
  }

  deleteCookie(c, "dp_session", { path: "/" });
  return c.json({ message: "Logged out" }, 200);
});

app.get("/me", async (c) => {
  const token = getCookie(c, "dp_session");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const db = c.get("db");
  const repo = new AuthRepository(db);
  const service = new AuthService(repo);

  const user = await service.validateSession(token);
  if (!user) return c.json({ error: "Session expired" }, 401);

  return c.json({ user }, 200);
});

export default app;
