import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, Check, ChevronLeft, ImagePlus, Loader2, Search, ShieldAlert, Sparkles, X } from 'lucide-react';
import type {
  SpeciesDiagnosisStepInput,
  SpeciesDiagnosisStepOutput,
  SpeciesRecognitionResult,
  DiagnosticFollowUpQuestion,
} from '../../packages/contracts/src/index';
import { fishData } from '../data/fishData';
import type { Aquarium, Fish } from '../types';
import { loadAppStateFromStorage } from '../services/storage/local-app-state';
import {
  getSpeciesDiagnosisStep,
  recognizeSpeciesImage,
  registerRecognitionMiss,
  resolveRecognitionMiss,
} from '../services/ai/species-identification.service';
import { getSpeciesDisplayImage } from '../lib/speciesVisual';
import { ResilientImage } from '../components/common/ResilientImage';
import { VisualResultCard } from '../components/visual-results/VisualResultCard';
import type { VisualResultStatus, VisualResultViewModel } from '../components/visual-results/visual-result.types';
import { SpeciesDetailDialog } from '../components/SpeciesDetailDialog';
import { useToast } from '../components/common/ToastProvider';
import { getSpeciesFavoriteIds, setSpeciesFavoriteIds } from '../services/favorites/favorites.service';
import { setCompatibilitySelection } from '../services/compatibility/compatibility-selection.service';
import { buildSpeciesDiagnosisContextAnswers, isSpeciesEligibleForHealthTriage, mapVisionCandidateToCatalog, normalizeSpeciesName, type MappedRecognitionCandidate } from '../lib/speciesRecognition';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';

type Stage = 'upload' | 'candidates' | 'describe' | 'question' | 'result';

const aquariumVolume = (aquarium?: Aquarium | null) => {
  const dimensions = aquarium?.dimensions;
  if (!dimensions) return '未填写';
  const liters = Number(dimensions.length) * Number(dimensions.width) * Number(dimensions.height) * 0.85 / 1000;
  return Number.isFinite(liters) && liters > 0 ? `约 ${Math.round(liters)}L` : '未填写';
};

const buildSnapshot = (aquarium?: Aquarium | null) => ({
  aquariumId: aquarium?.id || 'unselected',
  waterType: aquarium?.waterType || '未选择鱼缸',
  temperature: aquarium?.targetTemperature ? `${aquarium.targetTemperature}°C` : '未填写',
  volume: aquariumVolume(aquarium),
  stocked: aquarium?.fishes.map(item => {
    const fish = fishData.find(candidate => candidate.id === item.fishId);
    return `${fish?.name || item.fishId} × ${item.quantity}`;
  }).join('、') || '空缸或未选择鱼缸',
  recentWaterChange: aquarium?.lastWaterChangeDate || '未记录',
  recentFeeding: '未记录',
  recentAddedSpecies: aquarium?.fishes.some(item => {
    const entered = new Date(item.entryDate).getTime();
    return Number.isFinite(entered) && Date.now() - entered < 7 * 86_400_000;
  }) ? '近 7 天有新生物入缸' : '未发现近 7 天新增记录',
  dimensions: aquarium?.dimensions ? `${aquarium.dimensions.length}×${aquarium.dimensions.width}×${aquarium.dimensions.height}cm` : undefined,
  equipment: aquarium?.equipment
    ? [aquarium.equipment.filter && `过滤:${aquarium.equipment.filter}`, aquarium.equipment.oxygen ? '增氧:有' : '增氧:未记录', aquarium.equipment.heater ? '加热:有' : '加热:未记录'].filter(Boolean).join('；')
    : undefined,
  livestockCount: aquarium?.fishes.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0),
});

const statusFromUrgency = (urgency: SpeciesDiagnosisStepOutput['urgency']): VisualResultStatus => urgency;


export default function Identify() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { navigateToRoute, registerNavigationGuard } = useWorkspaceNavigation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const emergencyGuideRef = useRef<HTMLElement | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const diagnosisControllerRef = useRef<AbortController | null>(null);
  const diagnosisRequestIdRef = useRef(0);
  const diagnosisLockedRef = useRef(false);
  const diagnosisDelayRef = useRef<number | null>(null);
  const historyGuardInsertedRef = useRef(false);
  const [stage, setStage] = useState<Stage>('upload');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognition, setRecognition] = useState<(SpeciesRecognitionResult & { modelName?: string }) | null>(null);
  const [candidates, setCandidates] = useState<MappedRecognitionCandidate[]>([]);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [detailFish, setDetailFish] = useState<Fish | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [description, setDescription] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [questionHistory, setQuestionHistory] = useState<DiagnosticFollowUpQuestion[]>([]);
  const [diagnosis, setDiagnosis] = useState<SpeciesDiagnosisStepOutput | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [missId, setMissId] = useState('');
  const [cloudNotice, setCloudNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingNavigationPath, setPendingNavigationPath] = useState('');
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<{ questionId: string; value: string } | null>(null);
  const hasUnsavedDiagnosis = Boolean(description.trim()) && stage !== 'result' && stage !== 'upload';

  const appState = useMemo(() => loadAppStateFromStorage(), []);
  const aquarium = useMemo(() => appState.aquariums.find(item => item.id === appState.currentAquariumId) || appState.aquariums[0] || null, [appState]);
  const manualResults = useMemo(() => {
    const query = normalizeSpeciesName(manualQuery);
    if (query.length < 2) return [];
    return fishData.filter(fish => [fish.name, fish.scientificName, (fish as Fish & { _originalName?: string })._originalName || ''].some(value => normalizeSpeciesName(value).includes(query))).slice(0, 6);
  }, [manualQuery]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
    diagnosisControllerRef.current?.abort();
    if (diagnosisDelayRef.current !== null) window.clearTimeout(diagnosisDelayRef.current);
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (stage !== 'question') return;
    window.requestAnimationFrame(() => questionHeadingRef.current?.focus());
  }, [stage, diagnosis?.nextQuestion?.id]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedDiagnosis) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedDiagnosis]);

  useEffect(() => registerNavigationGuard(hasUnsavedDiagnosis
    ? (path) => {
      setPendingNavigationPath(path);
      return false;
    }
    : null), [hasUnsavedDiagnosis, registerNavigationGuard]);

  useEffect(() => {
    if (!hasUnsavedDiagnosis) {
      historyGuardInsertedRef.current = false;
      return;
    }
    if (historyGuardInsertedRef.current) return;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({ ...window.history.state, aquaguideIdentifyGuard: true }, '', currentUrl);
    historyGuardInsertedRef.current = true;
    const handlePopState = () => {
      if (!historyGuardInsertedRef.current) return;
      setPendingNavigationPath('__history_back__');
      window.history.pushState({ ...window.history.state, aquaguideIdentifyGuard: true }, '', currentUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedDiagnosis]);

  useEffect(() => {
    window.requestAnimationFrame(() => pageRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }));
  }, [stage]);

  const cancelDiagnosisSession = () => {
    diagnosisControllerRef.current?.abort();
    diagnosisRequestIdRef.current += 1;
    if (diagnosisDelayRef.current !== null) {
      window.clearTimeout(diagnosisDelayRef.current);
      diagnosisDelayRef.current = null;
    }
    diagnosisLockedRef.current = false;
    setIsDiagnosing(false);
    setPendingAnswer(null);
  };

  const reset = () => {
    requestControllerRef.current?.abort();
    cancelDiagnosisSession();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setRecognition(null);
    setCandidates([]);
    setSelectedFish(null);
    setDetailFish(null);
    setManualQuery('');
    setDescription('');
    setAnswers({});
    setAskedQuestionIds([]);
    setQuestionHistory([]);
    setDiagnosis(null);
    setMissId('');
    setCloudNotice('');
    setErrorMessage('');
    setShowEmergencyGuide(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStage('upload');
  };

  const requestReset = () => {
    if (hasUnsavedDiagnosis) {
      setPendingNavigationPath('__reset__');
      return;
    }
    reset();
  };

  const logMiss = async (result: SpeciesRecognitionResult & { modelName?: string }, mapped: MappedRecognitionCandidate[]) => {
    try {
      const response = await registerRecognitionMiss({
        imageFingerprint: result.imageFingerprint,
        modelName: result.modelName || 'vision-provider',
        candidateLabels: mapped.map(item => item.commonName),
        candidateCatalogKeys: mapped.flatMap(item => item.fish ? [item.fish.id] : []),
      });
      setMissId(response.missId || '');
      setCloudNotice(response.persisted ? '' : response.message || t('identify.cloudNotRecorded'));
    } catch {
      setCloudNotice(t('identify.cloudNotRecorded'));
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(t('identify.invalidFile'), 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('identify.fileTooLarge'), 'error');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setIsRecognizing(true);
    setCloudNotice('');
    setErrorMessage('');
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const result = await recognizeSpeciesImage(file, i18n.language === 'en' ? 'en' : 'zh-CN', controller.signal);
      const mapped = result.candidates.map(candidate => mapVisionCandidateToCatalog(candidate, fishData));
      setRecognition(result);
      setCandidates(mapped);
      setStage('candidates');
      const exactLibraryMatches = mapped.filter(item => item.fish && item.matchType !== 'fuzzy');
      if (exactLibraryMatches.length === 1 && result.status === 'matched') setDetailFish(exactLibraryMatches[0].fish || null);
      if (result.source === 'model' && mapped.every(item => !item.fish || item.matchType === 'fuzzy')) void logMiss(result, mapped);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : t('identify.recognitionFailed');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsRecognizing(false);
      requestControllerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmFish = async (fish: Fish) => {
    if (!isSpeciesEligibleForHealthTriage(fish)) {
      setDetailFish(fish);
      showToast(i18n.language === 'en'
        ? 'Health triage currently supports fish species only. You can still view this catalog entry.'
        : '状态判断第一版仅支持鱼类；你仍可查看该物种资料。', 'error');
      return;
    }
    setSelectedFish(fish);
    if (missId) {
      try {
        const response = await resolveRecognitionMiss(missId, fish.id);
        if (!response.persisted) setCloudNotice(response.message || t('identify.cloudNotRecorded'));
      } catch {
        setCloudNotice(t('identify.cloudNotRecorded'));
      }
    }
    setStage('describe');
  };

  const requestDiagnosis = async (nextAnswers = answers, nextAsked = askedQuestionIds, lockAcquired = false) => {
    if (!selectedFish || !description.trim() || (!lockAcquired && diagnosisLockedRef.current)) return;
    diagnosisLockedRef.current = true;
    setIsDiagnosing(true);
    setErrorMessage('');
    diagnosisControllerRef.current?.abort();
    const controller = new AbortController();
    diagnosisControllerRef.current = controller;
    const requestId = ++diagnosisRequestIdRef.current;
    try {
      const input: SpeciesDiagnosisStepInput = {
        locale: i18n.language === 'en' ? 'en' : 'zh-CN',
        speciesCatalogKey: selectedFish.id,
        aquariumSnapshot: buildSnapshot(aquarium),
        userDescription: description.trim(),
        answers: { ...buildSpeciesDiagnosisContextAnswers(selectedFish, aquarium), ...nextAnswers },
        askedQuestionIds: nextAsked,
      };
      const output = await getSpeciesDiagnosisStep(input, controller.signal);
      if (requestId !== diagnosisRequestIdRef.current) return;
      setDiagnosis(output);
      setPendingAnswer(null);
      if (output.nextQuestion) {
        setQuestionHistory(current => current.some(item => item.id === output.nextQuestion?.id)
          ? current
          : [...current, output.nextQuestion!]);
      }
      setStage(output.nextQuestion ? 'question' : 'result');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (requestId !== diagnosisRequestIdRef.current) return;
      const message = error instanceof Error ? error.message : t('identify.diagnosisFailed');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      if (requestId === diagnosisRequestIdRef.current) {
        diagnosisLockedRef.current = false;
        setIsDiagnosing(false);
        setPendingAnswer(null);
      }
    }
  };

  const answerQuestion = (questionId: string, value: string) => {
    if (diagnosisLockedRef.current) return;
    diagnosisLockedRef.current = true;
    setIsDiagnosing(true);
    setPendingAnswer({ questionId, value });
    const nextAnswers = { ...answers, [questionId]: value };
    const nextAsked = Array.from(new Set([...askedQuestionIds, questionId])).slice(0, 3);
    setAnswers(nextAnswers);
    setAskedQuestionIds(nextAsked);
    if (diagnosisDelayRef.current !== null) window.clearTimeout(diagnosisDelayRef.current);
    diagnosisDelayRef.current = window.setTimeout(() => {
      diagnosisDelayRef.current = null;
      void requestDiagnosis(nextAnswers, nextAsked, true);
    }, 180);
  };

  const revisitQuestion = (questionId: string) => {
    if (!diagnosis || diagnosisLockedRef.current) return;
    const index = questionHistory.findIndex(item => item.id === questionId);
    const question = questionHistory[index];
    if (!question) return;
    const retainedIds = questionHistory.slice(0, index).map(item => item.id);
    setAnswers(current => Object.fromEntries(Object.entries(current).filter(([id]) => retainedIds.includes(id))));
    setAskedQuestionIds(retainedIds);
    setQuestionHistory(current => current.slice(0, index + 1));
    setDiagnosis({ ...diagnosis, nextQuestion: question, complete: false });
    setStage('question');
  };

  const resultModel = useMemo<VisualResultViewModel | null>(() => {
    if (!diagnosis || !selectedFish) return null;
    const top = diagnosis.hypotheses[0];
    const related = (aquarium?.fishes || [])
      .filter(item => item.fishId !== selectedFish.id)
      .map(item => fishData.find(fish => fish.id === item.fishId))
      .filter((fish): fish is Fish => Boolean(fish))
      .slice(0, 3);
    const environmentLabels: Record<string, { zh: string; en: string; values: Record<string, { zh: string; en: string; status: VisualResultStatus }> }> = {
      water_fit: { zh: '水体', en: 'Water type', values: { match: { zh: '匹配', en: 'Matched', status: 'compatible' }, mismatch: { zh: '不匹配', en: 'Mismatch', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },
      temperature_fit: { zh: '温度', en: 'Temperature', values: { within: { zh: '在范围内', en: 'In range', status: 'compatible' }, outside: { zh: '超出范围', en: 'Out of range', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },
      space_fit: { zh: '空间', en: 'Tank space', values: { sufficient: { zh: '空间足够', en: 'Sufficient', status: 'compatible' }, insufficient: { zh: '空间不足', en: 'Insufficient', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },
      filter_status: { zh: '过滤', en: 'Filter', values: { present: { zh: '已配置', en: 'Present', status: 'compatible' }, missing: { zh: '未配置', en: 'Missing', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },
      oxygen_status: { zh: '增氧', en: 'Aeration', values: { present: { zh: '已配置', en: 'Present', status: 'compatible' }, missing: { zh: '未配置', en: 'Missing', status: 'caution' }, unknown: { zh: '未填写', en: 'Unknown', status: 'insufficient_data' } } },
    };
    const environmentSubjects = diagnosis.observations
      .filter(item => environmentLabels[item.code]?.values[item.value])
      .sort((left, right) => {
        const rank = (item: typeof left) => environmentLabels[item.code].values[item.value].status === 'caution' ? 0 : environmentLabels[item.code].values[item.value].status === 'insufficient_data' ? 1 : 2;
        return rank(left) - rank(right);
      })
      .slice(0, 3)
      .map(item => {
        const label = environmentLabels[item.code];
        const value = label.values[item.value];
        return { id: `environment:${item.code}`, name: i18n.language === 'en' ? label.en : label.zh, role: 'affected' as const, status: value.status, shortReason: i18n.language === 'en' ? value.en : value.zh, badgeLabel: i18n.language === 'en' ? value.en : value.zh };
      });
    const status = statusFromUrgency(diagnosis.urgency);
    return {
      status,
      title: t('identify.resultTitle'),
      conclusion: top ? `${t(`identify.likelihood.${top.likelihood}`)}：${top.label}` : t('identify.moreInfoNeeded'),
      emphasis: top ? [top.label, t(`identify.likelihood.${top.likelihood}`)] : [],
      subjects: [
        { id: selectedFish.id, name: selectedFish.name, image: getSpeciesDisplayImage(selectedFish), role: 'focus', status, shortReason: top?.label || t('identify.moreInfoNeeded') },
        ...environmentSubjects,
        ...related.slice(0, Math.max(0, 3 - environmentSubjects.length)).map(fish => ({ id: fish.id, name: fish.name, image: getSpeciesDisplayImage(fish), role: 'related' as const, status, shortReason: t('identify.sameTankContext') })),
      ],
      currentAction: diagnosis.emergencyActions[0] || top?.recommendedActions[0] || t('identify.keepObserving'),
      primaryAction: diagnosis.urgency === 'urgent'
        ? { label: i18n.language === 'en' ? 'Follow emergency steps' : '执行应急步骤', actionType: 'section' }
        : diagnosis.nextQuestion
        ? { label: t('identify.continueQuestion'), actionType: 'section' }
        : top?.recommendedArticleIds[0]
          ? { label: t('identify.openCareGuide'), actionType: 'route' }
          : { label: t('identify.checkAgain'), actionType: 'section' },
      detailSections: [
        { id: 'emergency', title: t('identify.emergencyActions'), items: diagnosis.emergencyActions },
        { id: 'evidence', title: t('identify.supportingEvidence'), items: top?.supportingEvidence || [] },
        { id: 'missing', title: t('identify.missingEvidence'), items: top?.missingEvidence || [] },
        { id: 'avoid', title: t('identify.avoidActions'), items: top?.avoidActions || [] },
      ].filter(section => section.items.length > 0),
    };
  }, [aquarium, diagnosis, i18n.language, selectedFish, t]);

  const handleResultAction = () => {
    if (!diagnosis) return;
    if (diagnosis.urgency === 'urgent') {
      setShowEmergencyGuide(true);
      window.requestAnimationFrame(() => {
        emergencyGuideRef.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        emergencyGuideRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    if (diagnosis.nextQuestion) {
      setStage('question');
      return;
    }
    const articleId = diagnosis.hypotheses[0]?.recommendedArticleIds[0];
    if (articleId) {
      navigate(`/care?topic=${encodeURIComponent(articleId)}`);
      return;
    }
    setStage('describe');
  };

  const requestNavigation = (path: string) => {
    if (hasUnsavedDiagnosis) {
      setPendingNavigationPath(path);
      return;
    }
    navigateToRoute(path);
  };

  const toggleWishlist = (fishId: string) => {
    const ids = new Set(getSpeciesFavoriteIds());
    if (ids.has(fishId)) ids.delete(fishId); else ids.add(fishId);
    setSpeciesFavoriteIds(Array.from(ids));
    showToast(ids.has(fishId) ? t('identify.saved') : t('identify.removed'));
  };

  return (
    <main ref={pageRef} className="page-frame-wide min-w-0 pb-24 pt-4 md:pb-8" data-identify-stage={stage}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => requestNavigation('/encyclopedia')} className="mb-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-xs font-black text-emerald-800 hover:bg-emerald-50">
            <ChevronLeft className="h-4 w-4" />{t('identify.backToGuide')}
          </button>
          <h1 className="text-[26px] font-black text-ink md:text-[32px]">{t('identify.title')}</h1>
          <p className="mt-1 max-w-[640px] text-sm font-medium leading-6 text-ink/55">{t('identify.subtitle')}</p>
        </div>
        {stage !== 'upload' && <button type="button" onClick={requestReset} className="min-h-11 shrink-0 rounded-full border border-border bg-white px-4 text-xs font-black text-ink/60">{t('identify.startOver')}</button>}
      </header>

      <div className="mx-auto grid w-full max-w-[980px] gap-4">
        <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-white p-2 ring-1 ring-border/70" aria-label={t('identify.progress')}>
          {[t('identify.stepPhoto'), t('identify.stepConfirm'), t('identify.stepTriage')].map((label, index) => {
            const activeIndex = stage === 'upload' || stage === 'candidates' ? 0 : stage === 'describe' ? 1 : 2;
            return <div key={label} className={`rounded-[13px] px-2 py-2 text-center text-[10px] font-black min-[420px]:text-xs ${index <= activeIndex ? 'bg-emerald-50 text-emerald-800' : 'text-ink/32'}`}>{index + 1}. {label}</div>;
          })}
        </div>
        {errorMessage && (
          <div role="alert" className="flex items-start gap-3 rounded-[16px] border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white" aria-label={t('common.close')}><X className="h-4 w-4" /></button>
          </div>
        )}

        {stage === 'upload' && (
          <section className="overflow-hidden rounded-[26px] border border-emerald-100 bg-white p-4 shadow-sm md:p-6">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] md:items-center">
              <button type="button" disabled={isRecognizing} onClick={() => fileInputRef.current?.click()} className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-emerald-200 bg-emerald-50/55 p-6 text-center transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-55">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"><Camera className="h-7 w-7" /></span>
                <span className="mt-4 text-lg font-black text-ink">{t('identify.choosePhoto')}</span>
                <span className="mt-2 max-w-[360px] text-xs font-medium leading-5 text-ink/50">{t('identify.photoHint')}</span>
              </button>
              <div className="rounded-[20px] bg-bg p-4">
                <h2 className="text-sm font-black text-ink">{t('identify.photoTips')}</h2>
                <div className="mt-3 grid gap-3 text-xs font-medium leading-5 text-ink/58">
                  <p>1. {t('identify.tipOne')}</p><p>2. {t('identify.tipTwo')}</p><p>3. {t('identify.tipThree')}</p>
                </div>
                <div className="mt-4 flex gap-2 rounded-[14px] border border-sky-100 bg-sky-50 p-3 text-[11px] font-bold leading-5 text-sky-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{t('identify.privacy')}</div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={isRecognizing} className="sr-only" onInput={event => void handleFile(event.currentTarget.files?.[0])} />
          </section>
        )}

        {isRecognizing && (
          <section className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm" aria-live="polite">
            <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
              <div className="h-[220px] overflow-hidden rounded-[20px] bg-bg">{previewUrl && <img src={previewUrl} alt={t('identify.uploadPreview')} className="h-full w-full object-contain" />}</div>
              <div><div className="h-2 w-full animate-pulse rounded-full bg-emerald-100"><div className="h-full w-2/3 rounded-full bg-emerald-500" /></div><Loader2 className="mt-4 h-7 w-7 animate-spin text-emerald-700" /><h2 className="mt-3 text-lg font-black">{t('identify.recognizing')}</h2><p className="mt-1 text-sm text-ink/50">{t('identify.recognizingHint')}</p><button type="button" onClick={() => { requestControllerRef.current?.abort(); if (fileInputRef.current) fileInputRef.current.value = ''; setIsRecognizing(false); }} className="mt-4 min-h-11 rounded-full border border-border px-4 text-xs font-black">{t('identify.cancel')}</button></div>
            </div>
          </section>
        )}

        {stage === 'candidates' && !isRecognizing && (
          <section className="grid gap-4 rounded-[26px] border border-emerald-100 bg-white p-4 shadow-sm md:p-6">
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="h-[240px] overflow-hidden rounded-[20px] bg-bg">{previewUrl && <img src={previewUrl} alt={t('identify.uploadPreview')} className="h-full w-full object-contain" />}</div>
              <div className="min-w-0">
                <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-5 w-5 text-emerald-700" /><div><h2 className="text-lg font-black">{t('identify.candidateTitle')}</h2><p className="mt-1 text-xs leading-5 text-ink/50">{t('identify.confirmHint')}</p></div></div>
                {recognition?.source === 'fallback' && <div className="mt-3 rounded-[14px] border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-800"><AlertTriangle className="mr-1 inline h-4 w-4" />{t('identify.manualFallback')}</div>}
                {cloudNotice && <div className="mt-2 text-[11px] font-bold text-amber-700">{cloudNotice}</div>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {candidates.filter(item => item.fish).map((candidate, index) => (
                    <article key={`${candidate.commonName}-${index}`} className="min-w-0 rounded-[18px] border border-border bg-bg p-3">
                      <div className="mx-auto h-28 w-full"><ResilientImage src={getSpeciesDisplayImage(candidate.fish!)} alt={candidate.fish!.name} className="h-full w-full object-contain" /></div>
                      <div className="mt-2 truncate text-sm font-black">{candidate.fish!.name}</div>
                      <div className="truncate text-[10px] italic text-ink/42">{candidate.fish!.scientificName}</div>
                      <div className="mt-2 text-[10px] font-bold text-ink/50">{t(`identify.confidence.${candidate.confidenceBand}`)} · {t(`identify.match.${candidate.matchType}`)}</div>
                      <button type="button" onClick={() => setDetailFish(candidate.fish!)} className="mt-3 min-h-10 w-full rounded-full border border-emerald-200 bg-white px-3 text-[11px] font-black text-emerald-800">{t('identify.viewDetails')}</button>
                      <button type="button" onClick={() => void confirmFish(candidate.fish!)} className="mt-2 min-h-11 w-full rounded-full bg-emerald-700 px-3 text-[11px] font-black text-white">{t('identify.confirmSpecies')}</button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-border bg-bg p-3">
              <label htmlFor="manual-species-search" className="text-xs font-black">{t('identify.manualSearch')}</label>
              <div className="relative mt-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" /><input id="manual-species-search" value={manualQuery} onChange={event => setManualQuery(event.target.value)} placeholder={t('identify.manualPlaceholder')} className="h-11 w-full rounded-full border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></div>
              {manualResults.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{manualResults.map(fish => <button key={fish.id} type="button" onClick={() => void confirmFish(fish)} className="flex min-h-12 items-center gap-3 rounded-[14px] bg-white p-2 text-left ring-1 ring-border"><ResilientImage src={getSpeciesDisplayImage(fish)} alt="" className="h-10 w-10 object-contain" /><span className="min-w-0"><strong className="block truncate text-xs">{fish.name}</strong><span className="block truncate text-[10px] italic text-ink/40">{fish.scientificName}</span></span><Check className="ml-auto h-4 w-4 text-emerald-700" /></button>)}</div>}
            </div>
            {candidates.every(item => !item.fish) && <button type="button" onClick={() => requestNavigation('/aquarium?action=daily-check')} className="min-h-11 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700">{t('identify.checkUrgentFirst')}</button>}
          </section>
        )}

        {stage === 'describe' && selectedFish && (
          <section className="grid gap-4 rounded-[26px] border border-emerald-100 bg-white p-4 shadow-sm md:grid-cols-[220px_1fr] md:p-6">
            <div className="rounded-[20px] bg-bg p-3 text-center"><div className="h-36"><ResilientImage src={getSpeciesDisplayImage(selectedFish)} alt={selectedFish.name} className="h-full w-full object-contain" /></div><div className="mt-2 text-sm font-black">{selectedFish.name}</div><div className="text-[10px] text-ink/40">{aquarium ? t('identify.withTank', { name: aquarium.name }) : t('identify.noTankContext')}</div></div>
            <div><h2 className="text-xl font-black">{t('identify.describeTitle')} <span className="text-red-600">*</span></h2><p className="mt-1 text-xs leading-5 text-ink/50">{t('identify.describeHint')}</p><textarea aria-required="true" value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} placeholder={t('identify.symptomPlaceholder')} className="mt-4 min-h-[150px] w-full resize-y rounded-[18px] border border-border bg-bg p-4 text-sm leading-6 outline-none focus:border-emerald-500" /><div className="mt-2 flex justify-between text-[10px] text-ink/35"><span>{t('identify.noDiagnosisPromise')}</span><span>{description.length}/1000</span></div><button type="button" disabled={!description.trim() || isDiagnosing} onClick={() => void requestDiagnosis()} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-black text-white disabled:bg-ink/20">{isDiagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('identify.startTriage')}</button></div>
          </section>
        )}

        {stage === 'question' && diagnosis?.nextQuestion && selectedFish && (
          <section className="rounded-[26px] border border-emerald-100 bg-white p-4 shadow-sm md:p-6">
            {diagnosis.urgency === 'urgent' && diagnosis.emergencyActions.length > 0 && <div className="mb-4 rounded-[18px] border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-red-800"><ShieldAlert className="h-5 w-5" />{t('identify.actBeforeQuestions')}</div><p className="mt-2 text-xs font-bold leading-5 text-red-700">{diagnosis.emergencyActions[0]}</p></div>}
            <div className="text-[11px] font-black text-emerald-700">{t('identify.questionCount', { current: askedQuestionIds.length + 1, total: 3 })}</div>
            {questionHistory.some(item => answers[item.id]) && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label={t('identify.previousAnswers')}>
                {questionHistory.filter(item => answers[item.id]).map(item => {
                  const selected = item.options.find(option => option.id === answers[item.id]);
                  return <button key={item.id} type="button" disabled={isDiagnosing} onClick={() => revisitQuestion(item.id)} className="min-h-10 rounded-full border border-border bg-bg px-3 text-[10px] font-black text-ink/60 disabled:opacity-45">{selected?.label || answers[item.id]} · {t('identify.edit')}</button>;
                })}
              </div>
            )}
            <h2 ref={questionHeadingRef} tabIndex={-1} className="mt-2 text-xl font-black outline-none">{diagnosis.nextQuestion.prompt}</h2>
            <p className="mt-2 text-xs leading-5 text-ink/50">{diagnosis.nextQuestion.reason}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{diagnosis.nextQuestion.options.map(option => { const selectedPending = pendingAnswer?.questionId === diagnosis.nextQuestion?.id && pendingAnswer.value === option.id; return <button key={option.id} type="button" aria-pressed={selectedPending} disabled={isDiagnosing} onClick={() => answerQuestion(diagnosis.nextQuestion!.id, option.id)} className={`min-h-12 rounded-[16px] border px-4 text-left text-sm font-black transition disabled:opacity-65 ${selectedPending ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200' : 'border-border bg-bg hover:border-emerald-400 hover:bg-emerald-50'}`}>{selectedPending ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}{option.label}</button>; })}</div>
            <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" disabled={isDiagnosing} onClick={() => setStage('describe')} className="min-h-11 rounded-full px-4 text-xs font-black text-ink/55 disabled:opacity-45"><ChevronLeft className="mr-1 inline h-4 w-4" />{t('identify.editDescription')}</button><button type="button" disabled={isDiagnosing} onClick={() => setStage('result')} className="min-h-11 rounded-full border border-emerald-200 bg-white px-4 text-xs font-black text-emerald-800 disabled:opacity-45">{t('identify.viewCurrentResult')}</button></div>
          </section>
        )}

        {stage === 'result' && diagnosis && resultModel && selectedFish && (
          <section className="grid gap-4">
            <VisualResultCard model={resultModel} onPrimaryAction={handleResultAction} />
            {showEmergencyGuide && diagnosis.emergencyActions.length > 0 && (
              <section ref={emergencyGuideRef} tabIndex={-1} className="rounded-[20px] border border-red-200 bg-red-50 p-4 outline-none" aria-labelledby="identify-emergency-guide-title">
                <h2 id="identify-emergency-guide-title" className="text-base font-black text-red-900">{t('identify.emergencyActions')}</h2>
                <ol className="mt-3 grid gap-2">{diagnosis.emergencyActions.map((action, index) => <li key={action} className="rounded-[14px] bg-white px-3 py-2 text-xs font-bold leading-5 text-red-800">{index + 1}. {action}</li>)}</ol>
                {diagnosis.nextQuestion && <button type="button" onClick={() => setStage('question')} className="mt-4 min-h-11 w-full rounded-full bg-red-700 px-4 text-xs font-black text-white">{t('identify.continueQuestion')}</button>}
              </section>
            )}
            <div className="grid gap-3 md:grid-cols-3">{diagnosis.hypotheses.map(hypothesis => <article key={hypothesis.code} className="rounded-[18px] border border-border bg-white p-4"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${hypothesis.likelihood === 'more_likely' ? 'bg-red-50 text-red-700' : hypothesis.likelihood === 'possible' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{t(`identify.likelihood.${hypothesis.likelihood}`)}</span><h3 className="mt-2 text-sm font-black">{hypothesis.label}</h3><p className="mt-2 text-[11px] font-bold leading-5 text-ink/55">{hypothesis.supportingEvidence[0] || t('identify.needMoreEvidence')}</p><details className="mt-3 rounded-[12px] border border-border bg-bg p-3"><summary className="cursor-pointer text-[10px] font-black text-emerald-800">{i18n.language === 'en' ? 'View evidence and actions' : '展开证据与建议'}</summary><div className="mt-3 grid gap-3 text-[10px] leading-5 text-ink/60"><div><strong className="text-ink">{t('identify.supportingEvidence')}</strong>{hypothesis.supportingEvidence.map(item => <p key={item}>{item}</p>)}</div>{hypothesis.contradictingEvidence.length > 0 && <div><strong className="text-ink">{i18n.language === 'en' ? 'Contradicting evidence' : '不一致的事实'}</strong>{hypothesis.contradictingEvidence.map(item => <p key={item}>{item}</p>)}</div>}<div><strong className="text-ink">{t('identify.missingEvidence')}</strong>{hypothesis.missingEvidence.length > 0 ? hypothesis.missingEvidence.map(item => <p key={item}>{item}</p>) : <p>{i18n.language === 'en' ? 'No key evidence is currently missing.' : '当前没有缺失的关键项。'}</p>}</div><div><strong className="text-ink">{i18n.language === 'en' ? 'Recommended actions' : '建议动作'}</strong>{hypothesis.recommendedActions.map(item => <p key={item}>{item}</p>)}</div><div><strong className="text-ink">{t('identify.avoidActions')}</strong>{hypothesis.avoidActions.map(item => <p key={item}>{item}</p>)}</div></div></details></article>)}</div>
            <p className="text-center text-[11px] font-bold leading-5 text-ink/45">{diagnosis.disclaimer}</p>
          </section>
        )}
      </div>

      <SpeciesDetailDialog fish={detailFish} open={Boolean(detailFish)} source="atlas" aquariumContext={aquarium} imageSrc={detailFish ? getSpeciesDisplayImage(detailFish) : ''} owned={Boolean(detailFish && aquarium?.fishes.some(item => item.fishId === detailFish.id))} inCalculator={false} inWishlist={Boolean(detailFish && getSpeciesFavoriteIds().includes(detailFish.id))} onOpenChange={open => !open && setDetailFish(null)} onAddToTank={fish => requestNavigation(`/aquarium?action=add-species&species=${encodeURIComponent(fish.id)}`)} onAddToCalculator={fish => { setCompatibilitySelection([fish.id]); requestNavigation('/encyclopedia#compatibility'); }} onToggleWishlist={toggleWishlist} onGoCalculator={() => { if (detailFish) setCompatibilitySelection([detailFish.id]); requestNavigation('/encyclopedia#compatibility'); }} onOpenTankSettings={() => requestNavigation('/aquarium#settings')} />
      {pendingNavigationPath && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="identify-leave-title" className="w-full max-w-[420px] rounded-[22px] bg-white p-5 shadow-2xl">
            <h2 id="identify-leave-title" className="text-lg font-black">{t('identify.leaveTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">{t('identify.leaveHint')}</p>
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPendingNavigationPath('')} className="min-h-11 rounded-full border border-border bg-white text-xs font-black">{t('identify.stay')}</button><button type="button" onClick={() => { const path = pendingNavigationPath; setPendingNavigationPath(''); historyGuardInsertedRef.current = false; cancelDiagnosisSession(); if (path === '__reset__') reset(); else if (path === '__history_back__') window.history.go(-2); else navigate(path); }} className="min-h-11 rounded-full bg-red-600 text-xs font-black text-white">{t('identify.leave')}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
