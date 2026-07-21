import { BookOpenCheck, Camera, Fish, Search as SearchIcon } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fishData } from '../data/fishData';
import { careTopicsData } from '../data/careTopicsData';
import { ResilientImage } from '../components/common/ResilientImage';
import { getSpeciesVisualSources } from '../lib/speciesVisual';
import { getCareVisualSources } from '../lib/careVisual';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { englishTranslations } from '../i18n/localizeData';
import { autoTranslations } from '../i18n/localizeDataAuto';
import { careTranslations } from '../i18n/localizeCareDataAuto';

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const originalValue = (record: object, key: string) => String((record as Record<string, unknown>)[key] ?? '');

export default function SearchPage() {
  const { t } = useTranslation();
  const { navigateToRoute } = useWorkspaceNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [draft, setDraft] = useState(query);
  const normalizedQuery = normalize(query);

  useEffect(() => {
    const sourceId = sessionStorage.getItem('aquaguide_search_return_focus');
    if (!sourceId) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(sourceId);
      target?.scrollIntoView({ block: 'center' });
      target?.focus({ preventScroll: true });
      sessionStorage.removeItem('aquaguide_search_return_focus');
    });
  }, []);

  const openSearchResult = (path: string, sourceId: string) => {
    sessionStorage.setItem('aquaguide_search_return_focus', sourceId);
    navigateToRoute(path);
  };

  const allSpeciesResults = useMemo(() => normalizedQuery
    ? fishData.filter(fish => normalize([
      fish.name,
      fish.scientificName,
      fish.category,
      fish.description,
      originalValue(fish, '_originalName'),
      originalValue(fish, '_originalCategory'),
      originalValue(fish, '_originalDescription'),
      englishTranslations[fish.id]?.name,
      englishTranslations[fish.id]?.description,
      autoTranslations[fish.id]?.name,
      autoTranslations[fish.id]?.description,
    ].join(' ')).includes(normalizedQuery))
    : [], [normalizedQuery]);
  const speciesResults = allSpeciesResults.slice(0, 18);
  const allCareResults = useMemo(() => normalizedQuery
    ? careTopicsData.filter(topic => normalize([
      topic.title,
      topic.category,
      topic.summary,
      ...topic.keywords,
      originalValue(topic, '_originalTitle'),
      originalValue(topic, '_originalCategory'),
      originalValue(topic, '_originalSummary'),
      careTranslations[topic.id]?.title,
      careTranslations[topic.id]?.summary,
      ...(careTranslations[topic.id]?.keywords || []),
    ].join(' ')).includes(normalizedQuery))
    : [], [normalizedQuery]);
  const careResults = allCareResults.slice(0, 12);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    setSearchParams(next ? { q: next } : {});
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-1 py-2 md:px-8 md:py-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">AquaGuide</p>
        <h1 className="mt-2 text-2xl font-black text-ink md:text-3xl">{t('searchPage.title')}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/50">{t('searchPage.subtitle')}</p>
      </header>

      <form onSubmit={submit} className="mt-5 flex min-w-0 gap-2 rounded-[22px] border border-white/80 bg-white p-2 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
        <SearchIcon className="ml-3 h-5 w-5 shrink-0 self-center text-ink/35" />
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={t('searchPage.placeholder')}
          aria-label={t('searchPage.placeholder')}
          className="min-w-0 flex-1 bg-transparent px-1 text-sm font-bold text-ink outline-none placeholder:text-ink/30"
        />
        <button type="submit" className="h-11 shrink-0 rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{t('searchPage.submit')}</button>
      </form>

      {!normalizedQuery && (
        <div className="mt-5 rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/55 p-6 text-center">
          <SearchIcon className="mx-auto h-7 w-7 text-emerald-700" />
          <p className="mt-3 text-sm font-black text-ink">{t('searchPage.emptyPrompt')}</p>
          <button type="button" onClick={() => navigateToRoute('/identify')} className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-800"><Camera className="h-4 w-4" />{t('identify.entry')}</button>
        </div>
      )}

      {normalizedQuery && speciesResults.length + careResults.length === 0 && (
        <div className="mt-5 rounded-[24px] bg-white p-7 text-center shadow-sm">
          <p className="text-sm font-black text-ink">{t('searchPage.noResults')}</p>
          <button type="button" onClick={() => navigateToRoute('/identify')} className="mt-4 h-11 rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white">{t('searchPage.tryPhoto')}</button>
        </div>
      )}

      {speciesResults.length > 0 && (
        <section className="mt-6" aria-labelledby="species-results-title">
          <div className="flex items-center justify-between gap-3"><h2 id="species-results-title" className="text-lg font-black text-ink">{t('searchPage.species')} · {allSpeciesResults.length}</h2></div>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {speciesResults.map(fish => (
              <button key={fish.id} id={`search-species-${fish.id}`} type="button" onClick={() => openSearchResult(`/encyclopedia?species=${encodeURIComponent(fish.id)}&source=search`, `search-species-${fish.id}`)} className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/80 bg-white p-3 text-left shadow-sm hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[18px] bg-emerald-50"><ResilientImage src={getSpeciesVisualSources(fish).thumbnail} alt={fish.name} className="h-full w-full object-contain p-2" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-black text-ink">{fish.name}</span><span className="mt-1 block truncate text-xs font-semibold italic text-ink/42">{fish.scientificName}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700"><Fish className="h-3.5 w-3.5" />{t('searchPage.openSpecies')}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {careResults.length > 0 && (
        <section className="mt-7" aria-labelledby="care-results-title">
          <h2 id="care-results-title" className="text-lg font-black text-ink">{t('searchPage.care')} · {allCareResults.length}</h2>
          <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
            {careResults.map(topic => (
              <button key={topic.id} id={`search-care-${topic.id}`} type="button" onClick={() => openSearchResult(`/care?topic=${encodeURIComponent(topic.id)}&source=search`, `search-care-${topic.id}`)} className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/80 bg-white p-3 text-left shadow-sm hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <span className="h-20 w-24 shrink-0 overflow-hidden rounded-[18px] bg-emerald-50"><ResilientImage src={getCareVisualSources(topic.imageUrl).thumbnail} alt={topic.title} className="h-full w-full object-cover" /></span>
                <span className="min-w-0"><span className="block text-sm font-black text-ink">{topic.title}</span><span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-ink/48">{topic.summary}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700"><BookOpenCheck className="h-3.5 w-3.5" />{t('searchPage.openCare')}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
