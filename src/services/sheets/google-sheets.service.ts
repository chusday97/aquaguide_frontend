import { loggerService } from '../logger/logger.service';
import { googleSheetsWriteInputSchema, GoogleSheetsWriteOutput } from './google-sheets.schema';

export const googleSheetsService = {
  writeRows: async (input: unknown): Promise<GoogleSheetsWriteOutput> => {
    const parsed = googleSheetsWriteInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'googleSheets',
        action: 'writeRows',
        message: 'Google Sheets write input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { ok: false, rowsWritten: 0 };
    }

    loggerService.info({
      module: 'googleSheets',
      action: 'writeRows',
      message: 'Google Sheets service is not connected yet',
      details: { sheetName: parsed.data.sheetName, rows: parsed.data.rows.length },
    });
    return { ok: false, rowsWritten: 0 };
  },
};

