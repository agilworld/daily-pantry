import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { placeOrderSchema, readyOrderSchema, deliverOrderSchema, cancelOrderSchema } from "./order.schema";
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

// Employee places order
app.post("/", roleGuard("employee"), async (c) => {
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

// Employee views own orders
app.get("/my", roleGuard("employee"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const orders = await service.getEmployeeOrders(user.id);
  return c.json({ orders }, 200);
});

// Seller views orders for their meals
app.get("/seller", roleGuard("seller"), async (c) => {
  const db = c.get("db");
  const repo = new OrderRepository(db);
  const service = new OrderService(repo);
  const user = c.get("user");
  const status = c.req.query("status") as string | undefined;
  const orders = await service.getSellerOrders(user.id, status as any);
  return c.json({ orders }, 200);
});

// Seller confirms order (placed -> confirmed)
app.patch("/:id/confirm", roleGuard("seller"), async (c) => {
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

// Seller marks order ready (confirmed -> ready)
app.patch("/:id/ready", roleGuard("seller"), async (c) => {
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

// Cancel order (employee own / seller own / office_boy any) — authenticated
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
