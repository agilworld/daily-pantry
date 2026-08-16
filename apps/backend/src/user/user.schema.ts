import { z } from "zod";

export const createUserBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role_id: z.string().min(1),
  phone_no: z.string().optional(),
});

export const updateUserBodySchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  phone_no: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone_no: z.string().optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
