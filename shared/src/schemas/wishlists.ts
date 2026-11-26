import { z } from 'zod';
import { arenaPlatformSchema } from './rooms';

export const wishlistVisibilitySchema = z.enum(['PRIVATE', 'ROOM', 'PUBLIC']);
export type WishlistVisibility = z.infer<typeof wishlistVisibilitySchema>;

export const createWishlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Wishlist name is required')
    .max(100, 'Wishlist name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  visibility: wishlistVisibilitySchema.optional().default('PRIVATE'),
  roomId: z
    .string()
    .trim()
    .min(3)
    .max(21)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room ID format')
    .optional(),
});

export type CreateWishlistInput = z.input<typeof createWishlistSchema>;
export type CreateWishlistOutput = z.output<typeof createWishlistSchema>;

export const updateWishlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Wishlist name is required')
    .max(100, 'Wishlist name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .nullable()
    .optional(),
  visibility: wishlistVisibilitySchema.optional(),
  roomId: z
    .string()
    .trim()
    .min(3)
    .max(21)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room ID format')
    .nullable()
    .optional(),
});

export type UpdateWishlistInput = z.infer<typeof updateWishlistSchema>;

export const savedProblemPayloadSchema = z.object({
  title: z.string().trim().min(1).max(300),
  platform: arenaPlatformSchema,
  url: z.string().max(1000).nullish(),
  contestId: z.number().int().positive().nullish(),
  index: z.string().max(32).nullish(),
  timeLimit: z.string().max(100).nullish(),
  memoryLimit: z.string().max(100).nullish(),
  difficulty: z.string().max(50).nullish(),
  tags: z.array(z.string().max(80)).max(50).nullish(),
  description: z.string().max(250_000).nullish(),
  inputSpecification: z.string().max(50_000).nullish(),
  outputSpecification: z.string().max(50_000).nullish(),
  sampleInput: z.string().max(50_000).nullish(),
  sampleOutput: z.string().max(50_000).nullish(),
  sampleCases: z
    .array(
      z.object({
        input: z.string().max(50_000),
        output: z.string().max(50_000).nullish(),
      })
    )
    .max(50)
    .nullish(),
  codeSnippets: z
    .array(
      z.object({
        lang: z.string().max(60),
        langSlug: z.string().max(60),
        code: z.string().max(50_000),
      })
    )
    .max(40)
    .nullish(),
});

export const addWishlistItemSchema = z
  .object({
    urlOrId: z.string().trim().min(1).max(500).optional(),
    platform: arenaPlatformSchema.optional(),
    problem: savedProblemPayloadSchema.optional(),
    note: z.string().trim().max(1000).nullish(),
  })
  .refine((data) => Boolean(data.urlOrId) || Boolean(data.problem), {
    message: 'Either urlOrId or problem payload is required',
  });

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;

export const bulkAddWishlistItemsSchema = z.object({
  items: z.array(addWishlistItemSchema).min(1).max(100),
});

export type BulkAddWishlistItemsInput = z.infer<typeof bulkAddWishlistItemsSchema>;
