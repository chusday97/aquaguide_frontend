import { z } from 'zod';

export const databaseReadInputSchema = z.object({
  table: z.string().min(1),
  key: z.string().min(1),
});

export const databaseWriteInputSchema = databaseReadInputSchema.extend({
  value: z.unknown(),
});

export const databaseDeleteInputSchema = databaseReadInputSchema;

export type DatabaseReadInput = z.infer<typeof databaseReadInputSchema>;
export type DatabaseWriteInput = z.infer<typeof databaseWriteInputSchema>;
export type DatabaseDeleteInput = z.infer<typeof databaseDeleteInputSchema>;

