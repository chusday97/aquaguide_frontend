import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../common/ToastProvider';
import type {
  NavigateToSectionOptions,
  WorkspaceNavigationContext,
  WorkspaceSectionId,
} from '../../types/navigation';

type WorkspaceNavigationValue = {
  navigateToRoute: (path: string) => void;
  navigateToView: (path: string, hash?: string) => void;
  navigateToSection: (sectionId: WorkspaceSectionId, options?: NavigateToSectionOptions) => Promise<boolean>;
  registerSection: (sectionId: WorkspaceSectionId, element: HTMLElement | null) => () => void;
  captureContext: (sourceId?: string) => WorkspaceNavigationContext;
  restoreContext: (context: WorkspaceNavigationContext) => Promise<boolean>;
  registerNavigationGuard: (guard: ((targetPath: string) => boolean) | null) => () => void;
};

const WorkspaceNavigationContextValue = createContext<WorkspaceNavigationValue | null>(null);

const getWorkspaceScroller = () => document.querySelector<HTMLElement>('.desktop-workspace-scroll');

const getScrollTop = () => {
  const scroller = getWorkspaceScroller();
  return scroller ? scroller.scrollTop : window.scrollY;
};

const waitForLayout = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => resolve());
  });
});

const getStickyOffset = (scroller: HTMLElement) => {
  const scrollerRect = scroller.getBoundingClientRect();
  let offset = 20;

  scroller.querySelectorAll<HTMLElement>('[data-workspace-sticky="true"]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    const isPinned = rect.top <= scrollerRect.top + 4 && rect.bottom > scrollerRect.top;
    if (isPinned) {
      offset = Math.max(offset, rect.bottom - scrollerRect.top + 12);
    }
  });

  return offset;
};

const focusAndHighlight = (element: HTMLElement) => {
  const hadTabIndex = element.hasAttribute('tabindex');
  if (!hadTabIndex) element.setAttribute('tabindex', '-1');

  element.classList.add('workspace-section-highlight');
  element.focus({ preventScroll: true });

  window.setTimeout(() => {
    element.classList.remove('workspace-section-highlight');
    if (!hadTabIndex) element.removeAttribute('tabindex');
  }, 1200);
};

const scrollElementIntoWorkspace = (element: HTMLElement, behavior: ScrollBehavior) => {
  const scroller = getWorkspaceScroller();
  if (!scroller) {
    const top = window.scrollY + element.getBoundingClientRect().top - 20;
    window.scrollTo({ top: Math.max(0, top), behavior });
    focusAndHighlight(element);
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const top = scroller.scrollTop + elementRect.top - scrollerRect.top - getStickyOffset(scroller);
  scroller.scrollTo({ top: Math.max(0, top), behavior });
  focusAndHighlight(element);
};

export function WorkspaceNavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const sectionsRef = useRef(new Map<WorkspaceSectionId, HTMLElement>());
  const navigationGuardRef = useRef<((targetPath: string) => boolean) | null>(null);

  const registerNavigationGuard = useCallback((guard: ((targetPath: string) => boolean) | null) => {
    navigationGuardRef.current = guard;
    return () => {
      if (navigationGuardRef.current === guard) navigationGuardRef.current = null;
    };
  }, []);

  const canNavigate = useCallback((targetPath: string) => navigationGuardRef.current?.(targetPath) ?? true, []);

  const navigateToRoute = useCallback((path: string) => {
    if (!canNavigate(path)) return;
    navigate(path);
  }, [canNavigate, navigate]);

  const navigateToView = useCallback((path: string, hash = '') => {
    const targetPath = `${path}${hash}`;
    if (!canNavigate(targetPath)) return;
    navigate(targetPath);
  }, [canNavigate, navigate]);

  const waitForSection = useCallback((sectionId: WorkspaceSectionId) => new Promise<HTMLElement>((resolve, reject) => {
    const findSection = () => sectionsRef.current.get(sectionId) ?? document.getElementById(sectionId);
    const existing = findSection();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = findSection();
      if (!element) return;
      observer.disconnect();
      window.clearTimeout(timeoutId);
      resolve(element);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Workspace section not found: ${sectionId}`));
    }, 2500);
  }), []);

  const navigateToSection = useCallback(async (
    sectionId: WorkspaceSectionId,
    options: NavigateToSectionOptions = {},
  ) => {
    const path = options.path ?? location.pathname;
    const updateHash = options.updateHash ?? true;
    const targetUrl = `${path}${updateHash ? `#${sectionId}` : ''}`;

    if (`${location.pathname}${location.hash}` !== targetUrl) {
      if (!canNavigate(targetUrl)) return false;
      navigate(targetUrl);
    }

    try {
      const element = await waitForSection(sectionId);
      scrollElementIntoWorkspace(element, options.behavior ?? 'smooth');
      return true;
    } catch (error) {
      console.error('Workspace navigation failed', error);
      showToast('目标内容暂不可用，请稍后重试', 'error');
      return false;
    }
  }, [canNavigate, location.hash, location.pathname, navigate, showToast, waitForSection]);

  const registerSection = useCallback((sectionId: WorkspaceSectionId, element: HTMLElement | null) => {
    if (element) sectionsRef.current.set(sectionId, element);
    return () => {
      if (sectionsRef.current.get(sectionId) === element) {
        sectionsRef.current.delete(sectionId);
      }
    };
  }, []);

  const captureContext = useCallback((sourceId?: string): WorkspaceNavigationContext => ({
    route: location.pathname,
    query: location.search,
    hash: location.hash,
    scrollTop: getScrollTop(),
    sourceId,
  }), [location.hash, location.pathname, location.search]);

  const restoreContext = useCallback(async (context: WorkspaceNavigationContext) => {
    const targetUrl = `${context.route}${context.query}${context.hash}`;
    if (`${location.pathname}${location.search}${location.hash}` !== targetUrl) {
      if (!canNavigate(targetUrl)) return false;
      navigate(targetUrl);
    }

    // Route and list state can both change while a detail surface closes. Wait
    // for the next painted layout before restoring the saved scroll position.
    await waitForLayout();
    const scroller = getWorkspaceScroller();
    if (scroller) {
      scroller.scrollTo({ top: context.scrollTop, behavior: 'auto' });
    } else {
      window.scrollTo({ top: context.scrollTop, behavior: 'auto' });
    }

    if (context.sourceId) {
      const source = document.getElementById(context.sourceId);
      if (source) {
        focusAndHighlight(source);
      }
    }
    return true;
  }, [canNavigate, location.hash, location.pathname, location.search, navigate]);

  const value = useMemo<WorkspaceNavigationValue>(() => ({
    navigateToRoute,
    navigateToView,
    navigateToSection,
    registerSection,
    captureContext,
    restoreContext,
    registerNavigationGuard,
  }), [captureContext, navigateToRoute, navigateToSection, navigateToView, registerNavigationGuard, registerSection, restoreContext]);

  return (
    <WorkspaceNavigationContextValue.Provider value={value}>
      {children}
    </WorkspaceNavigationContextValue.Provider>
  );
}

export function useWorkspaceNavigation() {
  const context = useContext(WorkspaceNavigationContextValue);
  if (!context) {
    throw new Error('useWorkspaceNavigation must be used within WorkspaceNavigationProvider');
  }
  return context;
}
