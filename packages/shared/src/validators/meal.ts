import { z } from "zod";

export const createMealSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price_cents: z.number().int().positive("Price must be positive"),
  // category_id = NULL means own-selling; a non-null UUID points to a food store (categories table).
  category_id: z.string().uuid("Must be a valid category id").optional().nullable(),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const updateMealSchema = createMealSchema.partial();

export const mealQuerySchema = z.object({
  category_id: z.string().uuid("Must be a valid category id").optional(),
  is_active: z.coerce.boolean().optional(),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type MealQueryInput = z.infer<typeof mealQuerySchema>;
