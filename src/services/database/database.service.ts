import { z } from 'zod';
import { loggerService } from '../logger/logger.service';
import { localStorageService } from '../storage/local-storage.service';
import { databaseDeleteInputSchema, databaseReadInputSchema, databaseWriteInputSchema } from './database.schema';

const storageKey = (table: string, key: string) => `aquaguide:${table}:${key}`;

export const databaseService = {
  read: <T>(input: unknown, schema: z.ZodType<T>, fallback: T): T => {
    const parsed = databaseReadInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'database',
        action: 'read',
        message: 'Read input failed schema validation',
        details: parsed.error.flatten(),
      });
      return fallback;
    }

    return localStorageService.readJson(storageKey(parsed.data.table, parsed.data.key), schema, fallback, {
      module: 'database',
      action: 'read',
    });
  },

  write: <T>(input: unknown, schema: z.ZodType<T>): boolean => {
    const parsed = databaseWriteInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'database',
        action: 'write',
        message: 'Write input failed schema validation',
        details: parsed.error.flatten(),
      });
      return false;
    }

    return localStorageService.writeJson(storageKey(parsed.data.table, parsed.data.key), parsed.data.value as T, schema, {
      module: 'database',
      action: 'write',
    });
  },

  delete: (input: unknown): boolean => {
    const parsed = databaseDeleteInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'database',
        action: 'delete',
        message: 'Delete input failed schema validation',
        details: parsed.error.flatten(),
      });
      return false;
    }

    return localStorageService.remove(storageKey(parsed.data.table, parsed.data.key), {
      module: 'database',
      action: 'delete',
    });
  },
};

