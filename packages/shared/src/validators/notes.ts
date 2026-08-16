import { z } from "zod";

export const createNoteSchema = z.object({
  content: z.string().min(1).max(1000),
  is_broadcast: z.boolean().default(true),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
