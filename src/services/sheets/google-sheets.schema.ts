import { z } from 'zod';

export const googleSheetsWriteInputSchema = z.object({
  sheetName: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const googleSheetsWriteOutputSchema = z.object({
  ok: z.boolean(),
  rowsWritten: z.number().int().nonnegative(),
});

export type GoogleSheetsWriteInput = z.infer<typeof googleSheetsWriteInputSchema>;
export type GoogleSheetsWriteOutput = z.infer<typeof googleSheetsWriteOutputSchema>;

