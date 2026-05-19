import { z } from 'zod';
import { loggerService } from '../logger/logger.service';

interface StorageContext {
  module: string;
  action: string;
}

const isBrowserStorageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const localStorageService = {
  readJson: <T>(key: string, schema: z.ZodType<T>, fallback: T, context: StorageContext): T => {
    try {
      if (!key || !isBrowserStorageAvailable()) {
        loggerService.warn({ ...context, message: 'localStorage unavailable or empty key', details: { key } });
        return fallback;
      }

      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;

      const parsed = JSON.parse(raw);
      const result = schema.safeParse(parsed);
      if (!result.success) {
        loggerService.warn({ ...context, message: 'Stored data failed schema validation', details: result.error.flatten() });
        return fallback;
      }

      loggerService.info({ ...context, message: 'Read local storage data', details: { key } });
      return result.data;
    } catch (error) {
      loggerService.error({ ...context, message: 'Failed to read local storage data', details: error });
      return fallback;
    }
  },

  writeJson: <T>(key: string, value: T, schema: z.ZodType<T>, context: StorageContext): boolean => {
    try {
      if (!key || !isBrowserStorageAvailable()) {
        loggerService.warn({ ...context, message: 'localStorage unavailable or empty key', details: { key } });
        return false;
      }

      const result = schema.safeParse(value);
      if (!result.success) {
        loggerService.warn({ ...context, message: 'Write blocked by schema validation', details: result.error.flatten() });
        return false;
      }

      window.localStorage.setItem(key, JSON.stringify(result.data));
      loggerService.info({ ...context, message: 'Wrote local storage data', details: { key } });
      return true;
    } catch (error) {
      loggerService.error({ ...context, message: 'Failed to write local storage data', details: error });
      return false;
    }
  },

  remove: (key: string, context: StorageContext): boolean => {
    try {
      if (!key || !isBrowserStorageAvailable()) return false;
      window.localStorage.removeItem(key);
      loggerService.info({ ...context, message: 'Removed local storage data', details: { key } });
      return true;
    } catch (error) {
      loggerService.error({ ...context, message: 'Failed to remove local storage data', details: error });
      return false;
    }
  },
};

