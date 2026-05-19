import { loggerService } from '../logger/logger.service';
import { authStateSchema, AuthState } from './auth.schema';

export const authService = {
  getCurrentUser: (): AuthState => {
    const fallback: AuthState = { user: { id: 'local-user', nickname: '本地用户' } };
    const parsed = authStateSchema.safeParse(fallback);
    if (!parsed.success) {
      loggerService.error({ module: 'auth', action: 'getCurrentUser', message: 'Fallback auth state failed validation', details: parsed.error.flatten() });
      return { user: null };
    }

    loggerService.info({ module: 'auth', action: 'getCurrentUser', message: 'Returned local auth user' });
    return parsed.data;
  },
};

