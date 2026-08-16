import { z } from "zod";
import { createMealSchema, updateMealSchema, mealQuerySchema } from "@dailypantry/shared";

export { createMealSchema, updateMealSchema, mealQuerySchema };

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type MealQueryInput = z.infer<typeof mealQuerySchema>;
