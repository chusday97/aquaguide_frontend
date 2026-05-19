import { z } from 'zod';

export const authUserSchema = z.object({
  id: z.string().min(1),
  openid: z.string().optional(),
  nickname: z.string().optional(),
});

export const authStateSchema = z.object({
  user: authUserSchema.nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthState = z.infer<typeof authStateSchema>;

