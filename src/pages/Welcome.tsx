import { ArrowRight, BookOpen, Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { chooseOnboardingGoal, skipOnboarding } from '../services/onboarding/onboarding.service';

export default function WelcomePage() {
  const { t } = useTranslation();
  const { navigateToRoute } = useWorkspaceNavigation();

  const choose = (goal: 'build_tank' | 'browse_species') => {
    chooseOnboardingGoal(goal);
    navigateToRoute(goal === 'build_tank'
      ? '/aquarium?action=create&source=onboarding'
      : '/encyclopedia?difficulty=Easy&source=onboarding');
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#d9f4e6_0,transparent_42%),linear-gradient(145deg,#f8fbf8,#e5efeb)] px-4 py-8 text-ink md:flex md:items-center md:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">AquaGuide</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{t('onboarding.welcomeTitle')}</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-ink/55 md:text-base">{t('onboarding.welcomeSubtitle')}</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => choose('build_tank')} className="group min-h-[240px] rounded-[30px] bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-left text-white shadow-[0_24px_64px_rgba(18,79,61,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 md:p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/14"><Droplets className="h-7 w-7" /></span>
            <h2 className="mt-8 text-2xl font-black">{t('onboarding.buildTitle')}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/68">{t('onboarding.buildSubtitle')}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-black">{t('onboarding.start')}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </button>
          <button type="button" onClick={() => choose('browse_species')} className="group min-h-[240px] rounded-[30px] border border-white/80 bg-white p-6 text-left shadow-[0_24px_64px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 md:p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-amber-50 text-amber-700"><BookOpen className="h-7 w-7" /></span>
            <h2 className="mt-8 text-2xl font-black">{t('onboarding.browseTitle')}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/52">{t('onboarding.browseSubtitle')}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-800">{t('onboarding.start')}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </button>
        </div>
        <button type="button" onClick={() => { skipOnboarding(); navigateToRoute('/aquarium'); }} className="mx-auto mt-6 block min-h-11 rounded-2xl px-4 text-sm font-black text-ink/45 hover:bg-white/70 hover:text-ink">{t('onboarding.skip')}</button>
      </div>
    </main>
  );
}
