import { z } from "zod";
import { MEAL_CATEGORIES } from "../constants/meal";

export const createMealSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price_cents: z.number().int().positive("Price must be positive"),
  category: z.enum(MEAL_CATEGORIES),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const updateMealSchema = createMealSchema.partial();

export const mealQuerySchema = z.object({
  category: z.enum(MEAL_CATEGORIES).optional(),
  is_active: z.coerce.boolean().optional(),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type MealQueryInput = z.infer<typeof mealQuerySchema>;
