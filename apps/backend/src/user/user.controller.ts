import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { createUserBodySchema, updateUserBodySchema, updateProfileSchema } from "./user.schema";
import type { Env } from "../types/env";
import type { DbClient } from "../middleware/db.middleware";

type Variables = {
  db: DbClient;
  user: {
    id: string;
    role_name: string;
  };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/users/me - any authenticated role (MUST be before /:id routes)
app.get("/me", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const repo = new UserRepository(db);
  const profile = await repo.findById(user.id);
  if (!profile) return c.json({ error: "User not found" }, 404);
  return c.json({ user: profile }, 200);
});

// PUT /api/users/me - any authenticated role (MUST be before /:id routes)
app.put("/me", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const repo = new UserRepository(db);
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  await repo.updateUser(user.id, parsed.data);
  const updated = await repo.findById(user.id);
  return c.json({ user: updated }, 200);
});

// Management routes below require office_boy role

app.get("/", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new UserRepository(db);
  const service = new UserService(repo);

  const role_id = c.req.query("role_id");
  const is_active = c.req.query("is_active");

  const filters: { role_id?: string; is_active?: boolean } = {};
  if (role_id) filters.role_id = role_id;
  if (is_active !== undefined) filters.is_active = is_active === "true";

  const users = await service.listUsers(filters);
  return c.json({ users }, 200);
});

app.post("/", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new UserRepository(db);
  const service = new UserService(repo);

  const body = await c.req.json();
  const parsed = createUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  try {
    const user = await service.addUser(parsed.data);
    return c.json({ user }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    const status = message === "Email already registered" ? 409 : 400;
    return c.json({ error: message }, status);
  }
});

app.patch("/:id", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new UserRepository(db);
  const service = new UserService(repo);

  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const user = await repo.findById(id);
  if (!user) return c.json({ error: "User not found" }, 404);

  if (parsed.data.is_active === false) {
    await service.deactivateUser(id);
  } else if (parsed.data.is_active === true) {
    await service.activateUser(id);
  } else {
    await repo.updateUser(id, parsed.data);
  }

  return c.json({ message: "User updated" }, 200);
});

app.get("/roles", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new UserRepository(db);
  const service = new UserService(repo);

  const roles = await service.getRoles();
  return c.json({ roles }, 200);
});

export default app;
