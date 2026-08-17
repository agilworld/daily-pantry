import { NotesRepository } from "./notes.repository";
import type { Note } from "./notes.model";

export class NotesService {
  constructor(private repo: NotesRepository) {}

  async listNotes(date?: string): Promise<Note[]> {
    return this.repo.findAll(date);
  }

  async createNote(
    authorId: string,
    data: { content: string; is_broadcast: boolean; image?: string | null; link_url?: string | null }
  ): Promise<Note> {
    return this.repo.create(authorId, data);
  }
}
