import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { createMealSchema, updateMealSchema, mealQuerySchema } from "./meal.schema";
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

// Public-ish: list active meals for ordering (all authenticated roles).
// Must be registered BEFORE /:id so it is not shadowed.
app.get("/active", authMiddleware, async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const query = mealQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Validation failed", details: query.error.flatten() }, 400);
  }
  const meals = await service.getActiveMeals(query.data.category_id);
  return c.json({ meals }, 200);
});

// Seller- and office-boy-scoped routes. Both roles manage ONLY their own meals
// (seller_id === user.id); neither can touch the other's meals.
app.get("/", roleGuard("seller", "office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const query = mealQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Validation failed", details: query.error.flatten() }, 400);
  }
  const meals = await service.listMeals(user.id, query.data.category_id);
  return c.json({ meals }, 200);
});

app.post("/", roleGuard("seller", "office_boy"), async (c) => {
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
    category_id: mealData.category_id ?? null,
  });
  return c.json({ meal }, 201);
});

app.get("/:id", roleGuard("seller", "office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new MealRepository(db);
  const service = new MealService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const meal = await service.getMeal(id);
  if (!meal || meal.seller_id !== user.id) return c.json({ error: "Meal not found" }, 404);
  return c.json({ meal }, 200);
});

app.patch("/:id", roleGuard("seller", "office_boy"), async (c) => {
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

app.patch("/:id/toggle", roleGuard("seller", "office_boy"), async (c) => {
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

app.delete("/:id", roleGuard("seller", "office_boy"), async (c) => {
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

export default app;
