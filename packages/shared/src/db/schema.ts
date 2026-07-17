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
