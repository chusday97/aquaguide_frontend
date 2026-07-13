import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LayoutMode = 'phone' | 'desktop';

type NavigatorLike = {
  userAgent?: string;
  userAgentData?: { mobile?: boolean };
};

export const detectLayoutMode = (navigatorLike?: NavigatorLike | null): LayoutMode => {
  if (!navigatorLike) return 'desktop';
  const userAgent = navigatorLike.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return 'desktop';
  if (/iPhone|iPod|Windows Phone|Android.+Mobile|Mobile.+Safari/i.test(userAgent)) return 'phone';

  if (typeof navigatorLike.userAgentData?.mobile === 'boolean') {
    return navigatorLike.userAgentData.mobile ? 'phone' : 'desktop';
  }
  return 'desktop';
};

type LayoutModeContextValue = {
  layoutMode: LayoutMode;
  isPhoneLayout: boolean;
};

const LayoutModeContext = createContext<LayoutModeContextValue | null>(null);

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [layoutMode] = useState<LayoutMode>(() => (
    typeof navigator === 'undefined' ? 'desktop' : detectLayoutMode(navigator)
  ));
  const value = useMemo(() => ({
    layoutMode,
    isPhoneLayout: layoutMode === 'phone',
  }), [layoutMode]);

  return <LayoutModeContext.Provider value={value}>{children}</LayoutModeContext.Provider>;
}

export const useLayoutMode = () => {
  const context = useContext(LayoutModeContext);
  if (!context) throw new Error('useLayoutMode must be used inside LayoutModeProvider');
  return context;
};
