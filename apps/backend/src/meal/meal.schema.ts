import { z } from "zod";
import { createMealSchema, updateMealSchema } from "@dailypantry/shared";

export { createMealSchema, updateMealSchema };

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
