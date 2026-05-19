import { databaseService } from '../../services/database/database.service';
import { loggerService } from '../../services/logger/logger.service';
import {
  wishlistAddInputSchema,
  wishlistListInputSchema,
  wishlistListOutputSchema,
  wishlistRemoveInputSchema,
  WishlistListOutput,
} from './wishlist.schema';

const table = 'wishlist';

export const wishlistService = {
  list: (input: unknown): WishlistListOutput => {
    const parsed = wishlistListInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({ module: 'wishlist', action: 'list', message: 'Wishlist list input failed schema validation', details: parsed.error.flatten() });
      return { items: [] };
    }

    return databaseService.read({ table, key: parsed.data.userId }, wishlistListOutputSchema, { items: [] });
  },

  add: (input: unknown): WishlistListOutput | null => {
    const parsed = wishlistAddInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({ module: 'wishlist', action: 'add', message: 'Wishlist add input failed schema validation', details: parsed.error.flatten() });
      return null;
    }

    const current = wishlistService.list({ userId: parsed.data.userId });
    const exists = current.items.some((item) => item.speciesId === parsed.data.speciesId);
    const items = exists ? current.items : [...current.items, { ...parsed.data, createdAt: new Date().toISOString() }];
    const ok = databaseService.write({ table, key: parsed.data.userId, value: { items } }, wishlistListOutputSchema);
    return ok ? { items } : null;
  },

  remove: (input: unknown): WishlistListOutput | null => {
    const parsed = wishlistRemoveInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({ module: 'wishlist', action: 'remove', message: 'Wishlist remove input failed schema validation', details: parsed.error.flatten() });
      return null;
    }

    const current = wishlistService.list({ userId: parsed.data.userId });
    const items = current.items.filter((item) => item.speciesId !== parsed.data.speciesId);
    const ok = databaseService.write({ table, key: parsed.data.userId, value: { items } }, wishlistListOutputSchema);
    return ok ? { items } : null;
  },
};

