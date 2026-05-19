import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import {
  WishlistAddInput,
  WishlistListInput,
  WishlistListOutput,
  WishlistRemoveInput,
  wishlistAddInputSchema,
  wishlistListInputSchema,
  wishlistRemoveInputSchema,
} from './wishlist.schema';
import { wishlistService } from './wishlist.service';

export const wishlistListModule: ModuleContract<WishlistListInput, WishlistListOutput> = {
  name: 'wishlist.list',
  run: async (input) => {
    const parsed = wishlistListInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('wishlist', 'list', 'INVALID_INPUT', '种草清单输入不合法', parsed.error.flatten());
    return createModuleSuccess('wishlist', 'list', wishlistService.list(parsed.data));
  },
};

export const wishlistAddModule: ModuleContract<WishlistAddInput, WishlistListOutput> = {
  name: 'wishlist.add',
  run: async (input) => {
    const parsed = wishlistAddInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('wishlist', 'add', 'INVALID_INPUT', '加入种草输入不合法', parsed.error.flatten());
    const output = wishlistService.add(parsed.data);
    if (!output) return createModuleFailure('wishlist', 'add', 'WRITE_FAILED', '加入种草失败');
    return createModuleSuccess('wishlist', 'add', output);
  },
};

export const wishlistRemoveModule: ModuleContract<WishlistRemoveInput, WishlistListOutput> = {
  name: 'wishlist.remove',
  run: async (input) => {
    const parsed = wishlistRemoveInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('wishlist', 'remove', 'INVALID_INPUT', '移除种草输入不合法', parsed.error.flatten());
    const output = wishlistService.remove(parsed.data);
    if (!output) return createModuleFailure('wishlist', 'remove', 'WRITE_FAILED', '移除种草失败');
    return createModuleSuccess('wishlist', 'remove', output);
  },
};

