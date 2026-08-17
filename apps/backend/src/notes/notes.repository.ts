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
        image: notes.image,
        link_url: notes.link_url,
        created_at: notes.created_at,
        author_name: users.name,
        author_avatar: users.avatar,
      })
      .from(notes)
      .innerJoin(users, eq(notes.author_id, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(notes.created_at))) as unknown as Note[];
  }

  async create(
    authorId: string,
    data: { content: string; is_broadcast: boolean; image?: string | null; link_url?: string | null }
  ): Promise<Note> {
    const rows = await this.db
      .insert(notes)
      .values({
        author_id: authorId,
        content: data.content,
        is_broadcast: data.is_broadcast,
        image: data.image ?? null,
        link_url: data.link_url ?? null,
      })
      .returning();
    const note = rows[0];
    const authors = await this.db
      .select({ avatar: users.avatar })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    return { ...note, author_avatar: authors[0]?.avatar ?? null } as Note;
  }
}
