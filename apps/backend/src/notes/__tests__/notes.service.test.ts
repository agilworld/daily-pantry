import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NotesService } from "../notes.service";
import { NotesRepository } from "../notes.repository";
import type { Note } from "../notes.model";

const sampleNote: Note = {
  id: "note-1",
  author_id: "user-1",
  content: "Lunch will be delayed by 30 minutes",
  is_broadcast: true,
  created_at: "2026-07-18T10:00:00.000Z",
  author_name: "Office Boy",
};

function createMockRepo(overrides: Partial<NotesRepository> = {}): NotesRepository {
  return {
    findAll: mock(() => Promise.resolve([sampleNote])),
    create: mock(() => Promise.resolve(sampleNote)),
    ...overrides,
  } as unknown as NotesRepository;
}

describe("NotesService", () => {
  let repo: NotesRepository;
  let service: NotesService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new NotesService(repo);
  });

  describe("listNotes", () => {
    it("returns all notes", async () => {
      const notes = await service.listNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe("Lunch will be delayed by 30 minutes");
    });

    it("passes the date filter to the repository", async () => {
      await service.listNotes("2026-07-18");
      expect(repo.findAll).toHaveBeenCalledWith("2026-07-18");
    });

    it("calls findAll with undefined when no date provided", async () => {
      await service.listNotes();
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe("createNote", () => {
    it("creates a note with author, content and broadcast flag", async () => {
      const note = await service.createNote("user-1", "New note", true);
      expect(note.id).toBe("note-1");
      expect(repo.create).toHaveBeenCalledWith("user-1", "New note", true);
    });
  });
});
