import { lazy, type ComponentType } from 'react';
import { classifyUiFailure, recordUiFailure } from '../services/diagnostics/ui-failure.service';

const wait = (duration: number) => new Promise(resolve => window.setTimeout(resolve, duration));

export const lazyWithRecovery = <T extends ComponentType<never>>(
  loader: () => Promise<{ default: T }>,
  routeKey: string,
) => lazy(async () => {
  const reloadKey = `aquaguide_chunk_reload_${routeKey}`;
  try {
    const module = await loader();
    sessionStorage.removeItem(reloadKey);
    return module;
  } catch (firstError) {
    recordUiFailure({ kind: classifyUiFailure(firstError), page: routeKey, error: firstError });
    await wait(260);
    try {
      const module = await loader();
      sessionStorage.removeItem(reloadKey);
      return module;
    } catch (secondError) {
      const kind = classifyUiFailure(secondError);
      recordUiFailure({ kind, page: routeKey, error: secondError });
      if (kind === 'chunk' && sessionStorage.getItem(reloadKey) !== '1') {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      throw secondError;
    }
  }
});
