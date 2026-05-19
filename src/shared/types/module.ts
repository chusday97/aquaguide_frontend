import { ModuleError, ModuleMeta } from '../schemas/result.schema';

export type ModuleResult<T> =
  | { ok: true; data: T; meta: ModuleMeta }
  | { ok: false; error: ModuleError; meta: ModuleMeta };

export interface ModuleContract<Input, Output> {
  name: string;
  run: (input: Input) => Promise<ModuleResult<Output>>;
}

export const createModuleMeta = (module: string, action: string): ModuleMeta => ({
  module,
  action,
  timestamp: new Date().toISOString(),
});

export const createModuleSuccess = <T>(module: string, action: string, data: T): ModuleResult<T> => ({
  ok: true,
  data,
  meta: createModuleMeta(module, action),
});

export const createModuleFailure = <T = never>(
  module: string,
  action: string,
  code: string,
  message: string,
  details?: unknown,
): ModuleResult<T> => ({
  ok: false,
  error: { code, message, details },
  meta: createModuleMeta(module, action),
});

