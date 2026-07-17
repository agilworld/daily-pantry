import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role_id: z.string().min(1),
  phone_no: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  phone_no: z.string().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
