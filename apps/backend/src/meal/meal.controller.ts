import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { createMealSchema, updateMealSchema } from "./meal.schema";
import { MealRepository } from "./meal.repository";
import { MealService } from "./meal.service";
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

// All routes require seller role
app.use("*", roleGuard("seller"));

app.get("/", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const category = c.req.query("category");
  const meals = await service.listMeals(user.id, category);
  return c.json({ meals }, 200);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = createMealSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  // ponytail: image_url from validator is accepted but not stored — add column when schema migrates
  const { image_url: _image, ...mealData } = parsed.data;
  const meal = await service.createMeal(user.id, {
    ...mealData,
    description: mealData.description ?? null,
  });
  return c.json({ meal }, 201);
});

app.get("/:id", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const meal = await service.getMeal(id);
  if (!meal || meal.seller_id !== user.id) return c.json({ error: "Meal not found" }, 404);
  return c.json({ meal }, 200);
});

app.patch("/:id", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateMealSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  try {
    const { image_url: _image, ...mealData } = parsed.data;
    const meal = await service.updateMeal(id, user.id, mealData);
    return c.json({ meal }, 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Meal not found" }, 404);
  }
});

app.patch("/:id/toggle", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const meal = await service.toggleActive(id, user.id);
    return c.json({ meal }, 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Meal not found" }, 404);
  }
});

app.delete("/:id", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await service.deleteMeal(id, user.id);
    return c.json({ message: "Meal deactivated" }, 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Meal not found" }, 404);
  }
});

/**
 * Public-ish: list active meals for ordering (employees / office boy browsing).
 * Not behind roleGuard("seller") — access control happens at a higher level.
 */
app.get("/active", async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const category = c.req.query("category");
  const meals = await service.getActiveMeals(category);
  return c.json({ meals }, 200);
});

export default app;
