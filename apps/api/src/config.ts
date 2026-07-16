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
};

export const isBusinessDatabaseConfigured = () => Boolean(
  apiConfig.supabaseUrl && apiConfig.supabaseAnonKey,
);
