import { Check, Languages, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLayoutMode } from '../layout/LayoutModeProvider';
import { setLocale, type SupportedLocale } from '../../i18n';
import { useSettings } from './SettingsProvider';

const options: Array<{ locale: SupportedLocale; labelKey: 'common.chinese' | 'common.english' }> = [
  { locale: 'zh-CN', labelKey: 'common.chinese' },
  { locale: 'en', labelKey: 'common.english' },
];

export function LanguageSettingsPanel() {
  const { t, i18n } = useTranslation();
  const { isPhoneLayout } = useLayoutMode();
  const { isOpen, closeSettings } = useSettings();
  if (!isOpen) return null;

  const currentLocale: SupportedLocale = i18n.language === 'en' ? 'en' : 'zh-CN';

  return (
    <div className="fixed inset-0 z-[120] bg-ink/25 backdrop-blur-[2px]" onMouseDown={closeSettings}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-settings-title"
        onMouseDown={event => event.stopPropagation()}
        className={isPhoneLayout
          ? 'absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[28px] bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_48px_rgba(15,23,42,0.18)]'
          : 'absolute bottom-4 left-[calc(var(--desktop-sidebar-width)+16px)] w-[340px] rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]'}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"><Languages className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id="language-settings-title" className="text-[17px] font-black text-ink">{t('common.settings')}</h2>
              <p className="mt-0.5 text-[11px] font-bold text-ink/45">{t('common.languageHint')}</p>
            </div>
          </div>
          <button type="button" onClick={closeSettings} aria-label={t('common.close')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/45 hover:bg-bg hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-4" role="radiogroup" aria-label={t('common.language')}>
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink/38">{t('common.language')}</div>
          <div className="grid gap-2">
            {options.map(option => {
              const selected = option.locale === currentLocale;
              return (
                <button
                  key={option.locale}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => void setLocale(option.locale)}
                  className={`flex min-h-12 w-full items-center justify-between rounded-[16px] border px-4 text-left text-[14px] font-black transition-colors ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-border/70 bg-white text-ink/65 hover:border-emerald-200'}`}
                >
                  <span>{t(option.labelKey)}</span>
                  {selected && <Check className="h-5 w-5" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
