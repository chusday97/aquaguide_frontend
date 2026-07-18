import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../../..');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

export const apiConfig = {
  port: Number(process.env.PORT || process.env.API_PORT || 8787),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  aiApiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
  aiBaseUrl: (process.env.AI_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
  aiModel: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 20_000),
  visionApiKey: process.env.VISION_API_KEY || '',
  visionBaseUrl: (process.env.VISION_BASE_URL || '').replace(/\/$/, ''),
  visionModel: process.env.VISION_MODEL || '',
  visionTimeoutMs: Number(process.env.VISION_TIMEOUT_MS || 20_000),
};

export const isBusinessDatabaseConfigured = () => Boolean(
  apiConfig.supabaseUrl && apiConfig.supabaseAnonKey,
);
