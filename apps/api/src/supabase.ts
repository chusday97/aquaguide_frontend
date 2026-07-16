import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiConfig, isBusinessDatabaseConfigured } from './config';
import { ApiError } from './http';

let publicClient: SupabaseClient | null = null;

export const getPublicSupabase = () => {
  if (!isBusinessDatabaseConfigured()) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '云端内容库尚未配置。');
  }
  publicClient ||= createClient(apiConfig.supabaseUrl, apiConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
};

export const getUserSupabase = (accessToken: string) => {
  if (!isBusinessDatabaseConfigured()) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '云端数据服务尚未配置。');
  }
  return createClient(apiConfig.supabaseUrl, apiConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
};

export const getAdminSupabase = () => {
  if (!apiConfig.supabaseUrl || !apiConfig.supabaseServiceRoleKey) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '管理员数据服务尚未配置。');
  }
  return createClient(apiConfig.supabaseUrl, apiConfig.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
