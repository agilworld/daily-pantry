import { z } from "zod";

// Accept only image data URLs (jpeg/png/webp/gif) as base64.
const imageSchema = z
  .string()
  .refine(
    (val) => val.startsWith("data:image/") && ["jpeg","png","webp","gif"].some((fmt) => val.startsWith(`data:image/${fmt};base64,`)),
    { message: "Image must be a base64 data URL (jpeg/png/webp/gif)" }
  )
  .optional();

export const createNoteSchema = z
  .object({
    content: z.string().max(1000).default(""),
    is_broadcast: z.boolean().default(true),
    image: imageSchema,
    link_url: z.string().url("Invalid URL").max(2048).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.content.trim() && !val.image && !val.link_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Note must have text, an image, or a link",
      });
    }
  });
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
