import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { SellerRepository } from "./seller.repository";
import { SellerService } from "./seller.service";
import { updateProfileBodySchema } from "./seller.schema";
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

// Middleware: authenticate + seller role check
app.use("*", roleGuard("seller"));

app.get("/profile", async (c) => {
  const db = c.get("db");
  const repo = new SellerRepository(db);
  const service = new SellerService(repo);

  const userId = c.get("user").id;
  const profile = await service.getProfile(userId);
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({ profile }, 200);
});

app.put("/profile", async (c) => {
  const db = c.get("db");
  const repo = new SellerRepository(db);
  const service = new SellerService(repo);

  const userId = c.get("user").id;
  const body = await c.req.json();
  const parsed = updateProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const updated = await service.updateProfile(userId, parsed.data);
  return c.json({ profile: updated }, 200);
});

export default app;
