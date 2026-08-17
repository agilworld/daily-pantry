import { describe, it, expect } from "bun:test";
import { createNoteSchema } from "../notes.schema";

const validImage = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const validUrl = "https://example.com/menu.pdf";

describe("createNoteSchema", () => {
  it("accepts a plain text note", () => {
    const result = createNoteSchema.safeParse({ content: "Lunch is ready" });
    expect(result.success).toBe(true);
  });

  it("accepts an image-only note", () => {
    const result = createNoteSchema.safeParse({ image: validImage });
    expect(result.success).toBe(true);
  });

  it("accepts a link-only note", () => {
    const result = createNoteSchema.safeParse({ link_url: validUrl });
    expect(result.success).toBe(true);
  });

  it("accepts image + link_url together with content", () => {
    const result = createNoteSchema.safeParse({
      content: "See menu",
      image: validImage,
      link_url: validUrl,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty note (no content, image, or link)", () => {
    const result = createNoteSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "Note must have text, an image, or a link")).toBe(true);
    }
  });

  it("rejects a blank content-only note", () => {
    const result = createNoteSchema.safeParse({ content: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects non-image data URLs", () => {
    const result = createNoteSchema.safeParse({ content: "x", image: "data:image/svg+xml;base64,PHN2Zz4=" });
    expect(result.success).toBe(false);
  });

  it("rejects non-base64 image prefixes", () => {
    const result = createNoteSchema.safeParse({ content: "x", image: "data:image/png;base64" });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported image formats", () => {
    const result = createNoteSchema.safeParse({ content: "x", image: "data:image/bmp;base64,Qk1" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid URL", () => {
    const result = createNoteSchema.safeParse({ content: "x", link_url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("defaults is_broadcast to true", () => {
    const result = createNoteSchema.safeParse({ content: "Lunch is ready" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_broadcast).toBe(true);
    }
  });

  it("accepts supported image formats (png/webp/gif)", () => {
    for (const fmt of ["png", "webp", "gif"]) {
      const result = createNoteSchema.safeParse({ content: "x", image: `data:image/${fmt};base64,AAAA` });
      expect(result.success).toBe(true);
    }
  });
});
