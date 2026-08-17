import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { placeOrderSchema, readyOrderSchema, deliverOrderSchema, cancelOrderSchema, listOrdersQuerySchema } from "./order.schema";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";
import { MealRepository } from "../meal/meal.repository";
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

// All authenticated roles place orders
app.post("/", authMiddleware, async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");

  const body = await c.req.json();
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  // Resolve meal to get seller_id, name, price
  const mealRepo = new MealRepository(db);
  const meal = await mealRepo.findById(parsed.data.meal_id);
  if (!meal) return c.json({ error: "Meal not found" }, 404);
  if (!meal.is_active) return c.json({ error: "Meal is not available" }, 400);

  try {
    const order = await service.placeOrder(user.id, {
      meal_id: parsed.data.meal_id,
      seller_id: meal.seller_id,
      meal_name: meal.name,
      meal_price_cents: meal.price_cents,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes ?? null,
    });
    return c.json({ order }, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to place order" }, 400);
  }
});

// All roles view own orders (optional date filter)
app.get("/my", authMiddleware, async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const date = c.req.query("date");
  const orders = await service.getEmployeeOrders(user.id, date);
  return c.json({ orders }, 200);
});

// Office boy lists all orders by date (defaults to today)
app.get("/", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);

  const query = c.req.query();
  const parsed = listOrdersQuerySchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  const orders = await service.getAllOrders(date);
  return c.json({ orders }, 200);
});

// Office boy confirms ALL placed orders (optional date filter) in one shot.
// Registered BEFORE /:id routes so "confirm-all" is not captured as an id.
app.post("/confirm-all", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const service = new OrderService(new OrderRepository(db));
  const date = c.req.query("date");
  try {
    const result = await service.confirmAllPlaced(date);
    return c.json(result, 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed" }, 400);
  }
});

// Seller views orders for their meals (optional date filter)
app.get("/seller", roleGuard("seller"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const status = c.req.query("status") as string | undefined;
  const date = c.req.query("date");
  const orders = await service.getSellerOrders(user.id, status as any, date);
  return c.json({ orders }, 200);
});

// Office boy confirms order (placed -> confirmed)
app.patch("/:id/confirm", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const order = await service.confirmOrder(id, user.id);
    return c.json({ order }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Order not found" ? 404 : 400;
    return c.json({ error: message }, status);
  }
});

// Office boy marks order ready (confirmed -> ready)
app.patch("/:id/ready", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = readyOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  try {
    const order = await service.readyOrder(id, user.id, parsed.data.fulfillment_notes);
    return c.json({ order }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Order not found" ? 404 : 400;
    return c.json({ error: message }, status);
  }
});

// Office boy delivers order (ready -> delivered)
app.patch("/:id/deliver", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = deliverOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  try {
    const order = await service.deliverOrder(id, user.id, parsed.data.fulfillment_notes);
    return c.json({ order }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Order not found" ? 404 : 400;
    return c.json({ error: message }, status);
  }
});

// Office boy views ready-for-delivery orders
app.get("/ready", roleGuard("office_boy"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const orders = await service.getReadyOrders();
  return c.json({ orders }, 200);
});

// Employee accepts a DELIVERED order (one-way, sets accepted_at)
app.post("/:id/accept", roleGuard("employee"), async (c) => {
  const db = c.get("db");
  const service = new OrderService(new OrderRepository(db));
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const order = await service.acceptOrder(id, user.id);
    return c.json({ order }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Order not found" ? 404 : message.startsWith("Not your") ? 403 : 400;
    return c.json({ error: message }, status);
  }
});

// Cancel order (own / office_boy any) — authenticated
app.patch("/:id/cancel", authMiddleware, async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = cancelOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  try {
    const order = await service.cancelOrder(id, user.id, user.role_name, parsed.data.fulfillment_notes);
    return c.json({ order }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Order not found" ? 404 : message.startsWith("Not your") || message.startsWith("Not authorized") ? 403 : 400;
    return c.json({ error: message }, status);
  }
});

export default app;
