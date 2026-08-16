import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role_id: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
