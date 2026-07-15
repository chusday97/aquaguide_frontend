export type UiFailureKind = 'chunk' | 'render' | 'image' | 'data';

export type UiFailureDiagnostic = {
  id: string;
  kind: UiFailureKind;
  page: string;
  buildVersion: string;
  resource?: string;
  message: string;
  occurredAt: string;
};

const SESSION_KEY = 'aquaguide_ui_failures_session';
export const DATA_RECOVERY_EVENT = 'aquaguide:data-recovered';

const getBuildVersion = () => import.meta.env.VITE_APP_VERSION || `${import.meta.env.MODE}-local`;

export const classifyUiFailure = (error: unknown): UiFailureKind => {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error || '');
  if (/dynamically imported module|loading chunk|chunkloaderror|failed to fetch dynamically/i.test(message)) return 'chunk';
  return 'render';
};

export const recordUiFailure = ({
  kind,
  page,
  resource,
  error,
}: {
  kind: UiFailureKind;
  page: string;
  resource?: string;
  error: unknown;
}): UiFailureDiagnostic => {
  const diagnostic: UiFailureDiagnostic = {
    id: `ui-failure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    page,
    buildVersion: getBuildVersion(),
    resource,
    message: error instanceof Error ? error.message.slice(0, 240) : String(error || '未知错误').slice(0, 240),
    occurredAt: new Date().toISOString(),
  };
  try {
    const previous = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]') as UiFailureDiagnostic[];
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...previous.slice(-19), diagnostic]));
  } catch {
    // Diagnostics must never become another user-facing failure.
  }
  return diagnostic;
};

export const formatUiFailureDiagnostic = (diagnostic: UiFailureDiagnostic) => [
  `页面：${diagnostic.page}`,
  `构建：${diagnostic.buildVersion}`,
  `类型：${diagnostic.kind}`,
  diagnostic.resource ? `资源：${diagnostic.resource}` : '',
  `时间：${diagnostic.occurredAt}`,
  `信息：${diagnostic.message}`,
].filter(Boolean).join('\n');

export const notifyDataRecovery = (resource: string, error: unknown) => {
  const page = typeof window === 'undefined' ? 'storage' : window.location.pathname;
  const diagnostic = recordUiFailure({ kind: 'data', page, resource, error });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DATA_RECOVERY_EVENT, { detail: diagnostic }));
};
