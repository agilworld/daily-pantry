import { eq, like, desc, and, sql } from "drizzle-orm";
import { notes, users } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Note } from "./notes.model";

export class NotesRepository {
  constructor(private db: DbClient) {}

  async findAll(date?: string): Promise<Note[]> {
    const conditions: ReturnType<typeof sql>[] = [];
    if (date) conditions.push(like(notes.created_at, `${date}%`));

    return (await this.db
      .select({
        id: notes.id,
        author_id: notes.author_id,
        content: notes.content,
        is_broadcast: notes.is_broadcast,
        created_at: notes.created_at,
        author_name: users.name,
      })
      .from(notes)
      .innerJoin(users, eq(notes.author_id, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(notes.created_at))) as unknown as Note[];
  }

  async create(authorId: string, content: string, isBroadcast: boolean): Promise<Note> {
    const rows = await this.db.insert(notes).values({ author_id: authorId, content, is_broadcast: isBroadcast }).returning();
    return rows[0] as Note;
  }
}
