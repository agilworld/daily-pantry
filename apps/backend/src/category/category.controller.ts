import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { createCategorySchema, updateCategorySchema } from "./category.schema";
import { CategoryRepository } from "./category.repository";
import { CategoryService } from "./category.service";
import type { Env } from "../types/env";
import type { DbClient } from "../middleware/db.middleware";

type Variables = { db: DbClient; user: { id: string; role_name: string } };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get("/", authMiddleware, async (c) => {
  const db = c.get("db");
  const service = new CategoryService(new CategoryRepository(db));
  const categories = await service.listCategories();
  return c.json({ categories }, 200);
});

app.post("/", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const service = new CategoryService(new CategoryRepository(db));
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  const category = await service.createCategory(
    {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
    user.id,
  );
  return c.json({ category }, 201);
});

app.patch("/:id", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const service = new CategoryService(new CategoryRepository(db));
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  const category = await service.updateCategory(id, {
    name: parsed.data.name,
    description: parsed.data.description,
  });
  if (!category) return c.json({ error: "Category not found" }, 404);
  return c.json({ category }, 200);
});

app.delete("/:id", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const service = new CategoryService(new CategoryRepository(db));
  const id = c.req.param("id");
  const ok = await service.deleteCategory(id);
  if (!ok) return c.json({ error: "Category not found" }, 404);
  return c.json({ message: "Category deactivated" }, 200);
});

export default app;
