import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  deleted_at: text("deleted_at"),
  updated_at: text("updated_at"),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone_no: text("phone_no"),
  description: text("description"),
  avatar: text("avatar"),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  blocked: integer("blocked", { mode: "boolean" }).default(false),
  role_id: text("role_id").references(() => roles.id),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  deleted_at: text("deleted_at"),
  updated_at: text("updated_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").default(sql`(current_timestamp)`),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seller_id: text("seller_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  deleted_at: text("deleted_at"),
  updated_at: text("updated_at"),
});

export const meals = sqliteTable("meals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seller_id: text("seller_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  price_cents: integer("price_cents").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  deleted_at: text("deleted_at"),
  updated_at: text("updated_at"),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_no: text("order_no").notNull().unique(),
  seller_id: text("seller_id").notNull().references(() => users.id),
  employee_id: text("employee_id").notNull().references(() => users.id),
  meal_id: text("meal_id").notNull().references(() => meals.id),
  meal_name: text("meal_name").notNull(),
  meal_price_cents: integer("meal_price_cents").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  total_cents: integer("total_cents").notNull(),
  status: text("status", { enum: ["placed", "confirmed", "ready", "delivered", "cancelled"] }).default("placed").notNull(),
  notes: text("notes"),
  fulfillment_notes: text("fulfillment_notes"),
  order_date: text("order_date").default(sql`(current_timestamp)`).notNull(),
  placed_at: text("placed_at").default(sql`(current_timestamp)`).notNull(),
  confirmed_at: text("confirmed_at"),
  ready_at: text("ready_at"),
  delivered_at: text("delivered_at"),
  cancelled_at: text("cancelled_at"),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  deleted_at: text("deleted_at"),
  updated_at: text("updated_at"),
});
