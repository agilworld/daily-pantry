import { z } from "zod";

export const updateProfileBodySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(500).optional(),
  qris_image: z.string().optional(),
});
