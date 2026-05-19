import { z } from 'zod';

export const wishlistItemSchema = z.object({
  userId: z.string().min(1).default('local-user'),
  speciesId: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const wishlistAddInputSchema = z.object({
  userId: z.string().min(1).default('local-user'),
  speciesId: z.string().min(1),
});

export const wishlistRemoveInputSchema = wishlistAddInputSchema;

export const wishlistListInputSchema = z.object({
  userId: z.string().min(1).default('local-user'),
});

export const wishlistListOutputSchema = z.object({
  items: z.array(wishlistItemSchema),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;
export type WishlistAddInput = z.infer<typeof wishlistAddInputSchema>;
export type WishlistRemoveInput = z.infer<typeof wishlistRemoveInputSchema>;
export type WishlistListInput = z.infer<typeof wishlistListInputSchema>;
export type WishlistListOutput = z.infer<typeof wishlistListOutputSchema>;

