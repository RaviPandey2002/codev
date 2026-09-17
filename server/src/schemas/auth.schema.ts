import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30,'Username can not be of more that 30 character.'),
  email: z.string().trim().toLowerCase().pipe(z.
    email('Invalid email address')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.
    email('Invalid email address')),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password must not exceed 100 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;