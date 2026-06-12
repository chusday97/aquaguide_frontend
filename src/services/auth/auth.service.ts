import { loggerService } from '../logger/logger.service';
import { authStateSchema, AuthState } from './auth.schema';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

export type SignInResult =
  | { ok: true; userId: string; email?: string }
  | { ok: false; reason: 'missing_config' | 'invalid_credentials' | 'network' | 'unknown'; message: string };

const isNetworkError = (message: string) => (
  /fetch|network|failed to fetch|load failed|timeout|abort/i.test(message)
);

const isInvalidCredentialsError = (message: string) => (
  /invalid login credentials|invalid credentials|email not confirmed|invalid email or password/i.test(message)
);

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

  signInWithEmailPassword: async (email: string, password: string): Promise<SignInResult> => {
    if (!isSupabaseConfigured || !supabase) {
      loggerService.warn({
        module: 'auth',
        action: 'signInWithEmailPassword',
        message: 'Supabase auth is not configured',
      });
      return { ok: false, reason: 'missing_config', message: 'Supabase auth is not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message || 'Login failed';
        const reason = isInvalidCredentialsError(message)
          ? 'invalid_credentials'
          : isNetworkError(message)
            ? 'network'
            : 'unknown';
        loggerService.warn({
          module: 'auth',
          action: 'signInWithEmailPassword',
          message,
          details: { reason },
        });
        return { ok: false, reason, message };
      }

      if (!data.user) {
        return { ok: false, reason: 'unknown', message: 'No user returned from Supabase' };
      }

      loggerService.info({
        module: 'auth',
        action: 'signInWithEmailPassword',
        message: 'Supabase login succeeded',
        details: { userId: data.user.id },
      });
      return { ok: true, userId: data.user.id, email: data.user.email || email };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      loggerService.error({
        module: 'auth',
        action: 'signInWithEmailPassword',
        message,
      });
      return { ok: false, reason: isNetworkError(message) ? 'network' : 'unknown', message };
    }
  },
};
