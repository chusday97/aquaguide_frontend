import { Check, Languages, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLocale, type SupportedLocale } from '../i18n';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { restartOnboarding } from '../services/onboarding/onboarding.service';

const localeOptions: Array<{ locale: SupportedLocale; label: string }> = [
  { locale: 'zh-CN', label: '简体中文' },
  { locale: 'en', label: 'English' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const currentLocale: SupportedLocale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en';
  const { navigateToRoute } = useWorkspaceNavigation();

  return (
    <div className="mx-auto w-full max-w-3xl px-1 py-2 md:px-8 md:py-8">
      <header className="rounded-[28px] bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white shadow-[0_18px_44px_rgba(18,79,61,0.18)] md:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14"><Languages className="h-6 w-6" /></span>
        <h1 className="mt-5 text-2xl font-black md:text-3xl">{t('settingsPage.title')}</h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/70">{t('settingsPage.subtitle')}</p>
      </header>

      <section className="mt-4 rounded-[28px] border border-white/70 bg-white p-5 shadow-sm md:mt-6 md:p-7" aria-labelledby="settings-language-title">
        <h2 id="settings-language-title" className="text-lg font-black text-ink">{t('common.language')}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-ink/52">{t('common.languageHint')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('common.language')}>
          {localeOptions.map(option => {
            const selected = option.locale === currentLocale;
            return (
              <button
                key={option.locale}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void setLocale(option.locale)}
                className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-border/70 text-ink/65 hover:border-emerald-200'}`}
              >
                {option.label}
                {selected && <Check className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/65 p-5">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-emerald-950">{t('settingsPage.onboardingTitle')}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-emerald-900/60">{t('settingsPage.onboardingHint')}</p>
            <button type="button" onClick={() => { restartOnboarding(); navigateToRoute('/welcome'); }} className="mt-3 min-h-11 rounded-2xl bg-white px-4 text-sm font-black text-emerald-800 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{t('settingsPage.replayOnboarding')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
