import { Check, ChevronRight, Circle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceNavigation } from '../layout/WorkspaceNavigationProvider';
import { subscribeToFavorites } from '../../services/favorites/favorites.service';
import { subscribeToAppState } from '../../services/storage/local-app-state';
import {
  dismissOnboardingTaskCard,
  getOnboardingState,
  getOnboardingTaskProgress,
  syncOnboardingCompletion,
} from '../../services/onboarding/onboarding.service';

export function OnboardingTaskCard() {
  const { t } = useTranslation();
  const { navigateToRoute } = useWorkspaceNavigation();
  const [, setRevision] = useState(0);
  const onboarding = getOnboardingState();
  const progress = getOnboardingTaskProgress();

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const unsubscribeState = subscribeToAppState(refresh);
    const unsubscribeFavorites = subscribeToFavorites(refresh);
    return () => { unsubscribeState(); unsubscribeFavorites(); };
  }, []);

  useEffect(() => {
    if (progress.complete) syncOnboardingCompletion();
  }, [progress.complete]);

  const tasks = useMemo(() => [
    { done: progress.aquariumReady, label: t('onboarding.taskTank'), route: '/aquarium?action=setup&source=onboarding' },
    { done: progress.speciesViewed, label: t('onboarding.taskViewSpecies'), route: '/encyclopedia?difficulty=Easy&source=onboarding' },
    { done: progress.speciesChosen, label: t('onboarding.taskChooseSpecies'), route: '/encyclopedia?difficulty=Easy&source=onboarding' },
    { done: progress.dailyCheckDone, label: t('onboarding.taskCheck'), route: '/aquarium?action=daily-check&source=onboarding' },
  ], [progress, t]);
  const nextTask = tasks.find(task => !task.done);

  if (!onboarding || onboarding.taskCardDismissed) return null;

  return (
    <section className="order-[1] min-w-0 rounded-[26px] border border-emerald-100 bg-gradient-to-r from-emerald-950 to-emerald-800 p-4 text-white shadow-[0_18px_44px_rgba(18,79,61,0.16)] md:order-none md:p-5" aria-labelledby="onboarding-task-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">{progress.completedCount} / 4</div>
          <h2 id="onboarding-task-title" className="mt-1 text-lg font-black">{progress.complete ? t('onboarding.completeTitle') : t('onboarding.taskTitle')}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/62">{progress.complete ? t('onboarding.completeSubtitle') : t('onboarding.taskSubtitle')}</p>
        </div>
        <button type="button" onClick={dismissOnboardingTaskCard} aria-label={t('onboarding.dismiss')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tasks.map(task => (
          <div key={task.label} className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2.5 ${task.done ? 'bg-emerald-400/15 text-emerald-50' : 'bg-white/8 text-white/64'}`}>
            {task.done ? <Check className="h-4 w-4 shrink-0 text-emerald-300" /> : <Circle className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 text-xs font-black leading-5">{task.label}</span>
          </div>
        ))}
      </div>
      {nextTask && (
        <button type="button" onClick={() => navigateToRoute(nextTask.route)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-emerald-900 shadow-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {nextTask.label}<ChevronRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
