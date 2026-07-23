import type { RequestHandler } from 'express';
import type { User } from '@supabase/supabase-js';
import { ApiError, type ApiRequest } from './http';
import { getUserSupabase } from './supabase';

export type AuthenticatedRequest = ApiRequest & {
  accessToken: string;
  authUser: User;
};

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.header('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new ApiError(401, 'AUTH_REQUIRED', '请先登录。');

    const accessToken = match[1].trim();
    const client = getUserSupabase(accessToken);
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) throw new ApiError(401, 'AUTH_REQUIRED', '登录状态已失效，请重新登录。');

    const authenticated = request as AuthenticatedRequest;
    authenticated.accessToken = accessToken;
    authenticated.authUser = data.user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = async (request, _response, next) => {
  try {
    const authenticated = request as AuthenticatedRequest;
    if (!authenticated.authUser || !authenticated.accessToken) {
      throw new ApiError(401, 'AUTH_REQUIRED', '请先登录。');
    }

    const client = getUserSupabase(authenticated.accessToken);
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', authenticated.authUser.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '暂时无法验证管理员权限。');
    if (data?.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', '没有内容管理权限。');
    next();
  } catch (error) {
    next(error);
  }
};
