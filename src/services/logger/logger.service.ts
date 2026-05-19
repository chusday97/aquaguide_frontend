type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  module: string;
  action: string;
  message: string;
  details?: unknown;
}

const writeLog = (level: LogLevel, payload: LogPayload) => {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (level === 'error') {
    console.error('[AquaGuide]', entry);
    return;
  }

  if (level === 'warn') {
    console.warn('[AquaGuide]', entry);
    return;
  }

  console.info('[AquaGuide]', entry);
};

export const loggerService = {
  info: (payload: LogPayload) => writeLog('info', payload),
  warn: (payload: LogPayload) => writeLog('warn', payload),
  error: (payload: LogPayload) => writeLog('error', payload),
};

