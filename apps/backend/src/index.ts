import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { dbMiddleware } from "./middleware/db.middleware";
import type { DbClient } from "./middleware/db.middleware";
import authController from "./auth/auth.controller";
import userController from "./user/user.controller";
import sellerController from "./seller/seller.controller";
import mealController from "./meal/meal.controller";
import orderController from "./order/order.controller";

type Variables = {
  db: DbClient;
  user: {
    id: string;
    name: string;
    email: string;
    role_id: string;
    role_name: string;
    phone_no: string | null;
    avatar: string | null;
    description: string | null;
    is_active: boolean;
    blocked: boolean;
    created_at: string;
  };
  currentUserId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3050"],
    credentials: true,
  })
);

app.use("*", dbMiddleware);

app.get("/", (c) => c.json({ message: "Daily Pantry API", status: "running" }));

app.route("/api/auth", authController);
app.route("/api/users", userController);
app.route("/api/sellers", sellerController);
app.route("/api/meals", mealController);
app.route("/api/orders", orderController);

export default app;
