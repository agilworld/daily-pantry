import { z } from "zod";

export const sellerProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
  qris_image: z.string().optional(),
});
export type SellerProfileInput = z.infer<typeof sellerProfileSchema>;
