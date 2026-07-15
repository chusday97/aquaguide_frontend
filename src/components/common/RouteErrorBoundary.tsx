import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Clipboard, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DATA_RECOVERY_EVENT,
  classifyUiFailure,
  formatUiFailureDiagnostic,
  recordUiFailure,
  type UiFailureDiagnostic,
} from '../../services/diagnostics/ui-failure.service';

class RouteErrorBoundaryInner extends Component<{
  children: ReactNode;
  page: string;
  resetKey: string;
}, { error: Error | null; diagnostic: UiFailureDiagnostic | null; copyState: string }> {
  state = { error: null, diagnostic: null, copyState: '' } as {
    error: Error | null;
    diagnostic: UiFailureDiagnostic | null;
    copyState: string;
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.setState({ diagnostic: recordUiFailure({ kind: classifyUiFailure(error), page: this.props.page, error }) });
  }

  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; page: string; resetKey: string }>) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, diagnostic: null, copyState: '' });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const diagnostic = this.state.diagnostic;
    return (
      <section className="mx-auto my-6 w-full max-w-[620px] rounded-[26px] border border-amber-100 bg-white p-5 text-center shadow-sm" role="alert">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-[20px] font-black text-ink">这个页面暂时没有加载好</h1>
        <p className="mx-auto mt-2 max-w-md text-[12px] font-bold leading-5 text-ink/52">其他页面仍可继续使用。可以先重试一次；如果再次出现，请复制诊断信息。</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => this.setState({ error: null, diagnostic: null, copyState: '' })} className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-800 px-4 text-[12px] font-black text-white">
            <RotateCcw className="mr-1.5 h-4 w-4" />重新尝试
          </button>
          <button type="button" onClick={() => window.location.assign('/aquarium')} className="h-11 rounded-full border border-emerald-100 bg-white px-4 text-[12px] font-black text-emerald-800">返回我的鱼缸</button>
          <button
            type="button"
            disabled={!diagnostic}
            onClick={async () => {
              if (!diagnostic) return;
              try {
                await navigator.clipboard.writeText(formatUiFailureDiagnostic(diagnostic));
                this.setState({ copyState: '诊断信息已复制' });
              } catch {
                this.setState({ copyState: '复制失败，请截屏反馈' });
              }
            }}
            className="inline-flex h-11 items-center justify-center rounded-full border border-ink/10 bg-white px-4 text-[12px] font-black text-ink/60 disabled:opacity-50"
          >
            <Clipboard className="mr-1.5 h-4 w-4" />复制诊断信息
          </button>
        </div>
        {this.state.copyState && <p className="mt-3 text-[11px] font-black text-emerald-800" aria-live="polite">{this.state.copyState}</p>}
      </section>
    );
  }
}

export function RouteErrorBoundary({ children, page }: { children: ReactNode; page: string }) {
  const location = useLocation();
  return <RouteErrorBoundaryInner page={page} resetKey={`${location.pathname}${location.search}`}>{children}</RouteErrorBoundaryInner>;
}

export function DataRecoveryNotice() {
  const navigate = useNavigate();
  const [diagnostic, setDiagnostic] = useState<UiFailureDiagnostic | null>(null);
  useEffect(() => {
    const handleRecovery = (event: Event) => setDiagnostic((event as CustomEvent<UiFailureDiagnostic>).detail);
    window.addEventListener(DATA_RECOVERY_EVENT, handleRecovery);
    return () => window.removeEventListener(DATA_RECOVERY_EVENT, handleRecovery);
  }, []);
  if (!diagnostic) return null;
  return (
    <div className="sticky top-2 z-40 mx-auto mb-3 flex w-[calc(100%-24px)] max-w-[720px] items-center justify-between gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900 shadow-sm" role="status">
      <span>一条本地记录格式异常，已先隔离并使用安全默认值。</span>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={() => navigate('/aquarium#local-data')} className="rounded-full bg-white px-2.5 py-1 font-black">查看恢复</button>
        <button type="button" aria-label="关闭恢复提示" onClick={() => setDiagnostic(null)} className="rounded-full px-2 py-1 font-black">关闭</button>
      </div>
    </div>
  );
}
