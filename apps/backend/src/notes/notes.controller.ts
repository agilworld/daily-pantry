import { Hono } from "hono";
import { roleGuard } from "../middleware/role.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { createNoteSchema } from "./notes.schema";
import { NotesRepository } from "./notes.repository";
import { NotesService } from "./notes.service";
import type { Env } from "../types/env";
import type { DbClient } from "../middleware/db.middleware";

type Variables = { db: DbClient; user: { id: string; role_name: string } };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// List notes - all authenticated roles
app.get("/", authMiddleware, async (c) => {
  const db = c.get("db");
  const service = new NotesService(new NotesRepository(db));
  const date = c.req.query("date");
  const notes = await service.listNotes(date);
  return c.json({ notes }, 200);
});

// Create note - seller or office boy
app.post("/", roleGuard("seller", "office_boy"), async (c) => {
  const db = c.get("db");
  const service = new NotesService(new NotesRepository(db));
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  const note = await service.createNote(user.id, parsed.data.content, parsed.data.is_broadcast);
  return c.json({ note }, 201);
});

export default app;
