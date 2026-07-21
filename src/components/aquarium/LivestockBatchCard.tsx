import { Baby, GitBranch, GitMerge, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AquariumFish, AquariumSpeciesBatch, Fish, LifeStage, ReproductiveState } from '../../types';
import { getSpeciesDisplayImage, getSpeciesImageClass } from '../../lib/speciesVisual';
import { useWorkspaceNavigation } from '../layout/WorkspaceNavigationProvider';
import {
  deleteSpeciesBatch,
  normalizeSpeciesBatches,
  splitSpeciesBatch,
  summarizeSpeciesBatches,
  updateSpeciesBatch,
  getSpeciesBatchObservation,
  mergeSpeciesBatches,
} from '../../services/aquarium/species-batches.service';

type Props = {
  fish: Fish;
  record: AquariumFish;
  reproductiveApplicable: boolean;
  onOpenDetail: () => void;
  onSave: (record: AquariumFish | null) => void | Promise<void>;
};

const lifeStageOptions: LifeStage[] = ['unknown', 'juvenile', 'adult'];

const reproductiveOptions: ReproductiveState[] = ['unknown', 'normal', 'pregnant_or_gravid', 'in_labor_or_spawning', 'postpartum_recovery'];

const summarize = (record: AquariumFish, t: TFunction) => {
  const summary = summarizeSpeciesBatches(record);
  const parts = [t('livestock.summaryTotal', { count: summary.total })];
  if (summary.juvenile) parts.push(t('livestock.summaryJuvenile', { count: summary.juvenile }));
  if (summary.adult) parts.push(t('livestock.summaryAdult', { count: summary.adult }));
  if (summary.pregnant) parts.push(t('livestock.summaryPregnant', { count: summary.pregnant }));
  if (summary.spawning) parts.push(t('livestock.summarySpawning', { count: summary.spawning }));
  if (summary.recovery) parts.push(t('livestock.summaryRecovery', { count: summary.recovery }));
  if (summary.unknown === summary.total) parts.push(t('livestock.summaryUnknown'));
  return parts.join(' · ');
};

export function LivestockBatchCard({ fish, record, reproductiveApplicable, onOpenDetail, onSave }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(record);
  const [splitSource, setSplitSource] = useState<AquariumSpeciesBatch | null>(null);
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [splitLifeStage, setSplitLifeStage] = useState<LifeStage>('adult');
  const [splitReproductiveState, setSplitReproductiveState] = useState<ReproductiveState>('normal');
  const [pendingDelete, setPendingDelete] = useState<AquariumSpeciesBatch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const pendingHistoryDeltaRef = useRef<number | null>(null);
  const restoringHistoryRef = useRef(false);
  const allowHistoryNavigationRef = useRef(false);
  const [error, setError] = useState('');
  const { navigateToRoute, registerNavigationGuard } = useWorkspaceNavigation();

  useEffect(() => setDraft(record), [record]);
  const batches = useMemo(() => normalizeSpeciesBatches(draft), [draft]);
  const observation = getSpeciesBatchObservation(record, isEn);

  const update = (batchId: string, patch: Partial<Pick<AquariumSpeciesBatch, 'quantity' | 'entryDate' | 'lifeStage' | 'reproductiveState'>>) => {
    setDraft(current => updateSpeciesBatch(current, batchId, patch));
    setError('');
  };

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave(reproductiveApplicable ? draft : {
        ...draft,
        batches: normalizeSpeciesBatches(draft).map(batch => ({ ...batch, reproductiveState: 'not_applicable' as const })),
      });
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('livestock.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSplit = () => {
    if (!splitSource) return;
    try {
      setDraft(current => splitSpeciesBatch(current, splitSource.id, {
        quantity: splitQuantity,
        lifeStage: splitLifeStage,
        reproductiveState: reproductiveApplicable ? splitReproductiveState : 'not_applicable',
      }));
      setSplitSource(null);
      setError('');
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : t('livestock.splitFailed'));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;
    const next = deleteSpeciesBatch(draft, pendingDelete.id);
    if (next) {
      setIsDeleting(true);
      setError('');
      try {
        await onSave(next);
        setDraft(next);
        setPendingDelete(null);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : t('livestock.deleteFailed'));
      } finally {
        setIsDeleting(false);
      }
      return;
    }
    setIsDeleting(true);
    try {
      await onSave(null);
      setPendingDelete(null);
      setOpen(false);
    } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : t('livestock.removeFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(record);
  const requestClose = () => {
    if (hasUnsavedChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open || !hasUnsavedChanges) return;
    return registerNavigationGuard(path => {
      setPendingNavigationPath(path);
      setIsDiscardConfirmOpen(true);
      return false;
    });
  }, [hasUnsavedChanges, open, registerNavigationGuard]);

  useEffect(() => {
    if (!open || !hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, open]);

  useEffect(() => {
    if (!open || !hasUnsavedChanges) return;
    const originIndex = Number(window.history.state?.idx);
    const handlePopState = (event: PopStateEvent) => {
      if (allowHistoryNavigationRef.current) {
        allowHistoryNavigationRef.current = false;
        return;
      }
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        return;
      }
      const targetIndex = Number(event.state?.idx);
      if (!Number.isFinite(originIndex) || !Number.isFinite(targetIndex) || originIndex === targetIndex) return;
      const delta = targetIndex - originIndex;
      pendingHistoryDeltaRef.current = delta;
      setPendingNavigationPath('__history__');
      setIsDiscardConfirmOpen(true);
      restoringHistoryRef.current = true;
      window.history.go(-delta);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, open]);

  const discardAndContinue = () => {
    const target = pendingNavigationPath;
    const historyDelta = pendingHistoryDeltaRef.current;
    setIsDiscardConfirmOpen(false);
    setPendingNavigationPath(null);
    pendingHistoryDeltaRef.current = null;
    setDraft(record);
    setOpen(false);
    if (target === '__history__' && historyDelta) {
      allowHistoryNavigationRef.current = true;
      window.history.go(historyDelta);
      return;
    }
    if (target) navigateToRoute(target);
  };

  return (
    <>
      <article className="col-span-1 min-w-0 rounded-[18px] border border-emerald-100 bg-white p-3 shadow-sm lg:col-span-2">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onOpenDetail} className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={t('livestock.openProfile', { name: fish.name })}>
            <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`h-[88%] w-[88%] object-contain ${getSpeciesImageClass(fish)}`} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black text-ink">{fish.name}</h3>
            <p className="mt-1 text-[11px] font-bold leading-5 text-ink/48">{summarize(record, t)}</p>
            {observation && <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-amber-700">{t('livestock.observePrefix')}{observation}</p>}
            <button type="button" onClick={() => { setDraft(record); setOpen(true); }} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-800 hover:bg-emerald-100"><Pencil className="h-3.5 w-3.5" />{t('livestock.manageGroups')}</button>
          </div>
        </div>
      </article>

      <Dialog open={open} onOpenChange={next => {
        if (isSaving) return;
        if (!next) requestClose();
        else setOpen(true);
      }}>
        <DialogContent className="max-h-[88dvh] max-w-3xl overflow-hidden rounded-[28px] p-0">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
            <DialogTitle>{t('livestock.manageTitle', { name: fish.name })}</DialogTitle>
            <DialogDescription>{t('livestock.manageDescription')}</DialogDescription>
          </DialogHeader>
          <div className="app-scrollbar-hidden min-h-0 overflow-y-auto px-4 py-4 md:px-5">
            <div className="grid gap-3">
              {batches.map((batch, index) => (
                <section key={batch.id} className="rounded-[20px] border border-border/80 bg-bg/55 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-black text-ink"><Baby className="h-4 w-4 text-emerald-700" />{t('livestock.groupTitle', { index: index + 1 })}</div>
                    <div className="flex gap-1">
                      {batch.quantity > 1 && <button type="button" onClick={() => { setSplitSource(batch); setSplitQuantity(1); }} className="flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-black text-emerald-700 hover:bg-emerald-50"><GitBranch className="h-4 w-4" />{t('livestock.split')}</button>}
                      {index > 0 && batches[index - 1].lifeStage === batch.lifeStage && batches[index - 1].reproductiveState === batch.reproductiveState && <button type="button" onClick={() => { setDraft(current => mergeSpeciesBatches(current, batches[index - 1].id, batch.id)); setError(''); }} className="flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-black text-sky-700 hover:bg-sky-50"><GitMerge className="h-4 w-4" />{t('livestock.mergePrevious')}</button>}
                      <button type="button" onClick={() => setPendingDelete(batch)} aria-label={t('livestock.deleteGroupLabel', { index: index + 1 })} className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-black text-ink/55">{t('livestock.quantity')}<input type="number" min={1} value={batch.quantity} onChange={event => update(batch.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink" /></label>
                    <label className="text-xs font-black text-ink/55">{t('livestock.entryDate')}<input type="date" value={batch.entryDate.slice(0, 10)} onChange={event => update(batch.id, { entryDate: new Date(`${event.target.value}T00:00:00`).toISOString() })} className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink" /></label>
                    <label className="text-xs font-black text-ink/55">{t('livestock.lifeStageLabel')}<select value={batch.lifeStage} onChange={event => update(batch.id, { lifeStage: event.target.value as LifeStage })} className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink">{lifeStageOptions.map(option => <option key={option} value={option}>{t(`livestock.lifeStage.${option}`)}</option>)}</select></label>
                    {reproductiveApplicable && <label className="text-xs font-black text-ink/55">{t('livestock.reproductiveStateLabel')}<select value={batch.reproductiveState === 'not_applicable' ? 'unknown' : batch.reproductiveState} onChange={event => update(batch.id, { reproductiveState: event.target.value as ReproductiveState })} className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink">{reproductiveOptions.map(option => <option key={option} value={option}>{t(`livestock.reproductiveState.${option}`)}</option>)}</select></label>}
                  </div>
                </section>
              ))}
            </div>

            {splitSource && (
              <section className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-amber-950">{t('livestock.splitTitle')}</h3><p className="mt-1 text-xs font-semibold text-amber-900/60">{t('livestock.currentGroup', { count: splitSource.quantity })}</p></div><button type="button" onClick={() => setSplitSource(null)} className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-900/60"><X className="h-4 w-4" /></button></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-black text-amber-950/70">{t('livestock.moveQuantity')}<input type="number" min={1} max={Math.max(1, splitSource.quantity - 1)} value={splitQuantity} onChange={event => setSplitQuantity(Number(event.target.value) || 1)} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3" /></label>
                  <label className="text-xs font-black text-amber-950/70">{t('livestock.lifeStageLabel')}<select value={splitLifeStage} onChange={event => setSplitLifeStage(event.target.value as LifeStage)} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3">{lifeStageOptions.map(option => <option key={option} value={option}>{t(`livestock.lifeStage.${option}`)}</option>)}</select></label>
                  {reproductiveApplicable && <label className="text-xs font-black text-amber-950/70">{t('livestock.reproductiveStateLabel')}<select value={splitReproductiveState} onChange={event => setSplitReproductiveState(event.target.value as ReproductiveState)} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3">{reproductiveOptions.map(option => <option key={option} value={option}>{t(`livestock.reproductiveState.${option}`)}</option>)}</select></label>}
                </div>
                <button type="button" onClick={confirmSplit} className="mt-3 min-h-11 rounded-xl bg-amber-900 px-4 text-sm font-black text-white"><Plus className="mr-1 inline h-4 w-4" />{t('livestock.confirmSplit')}</button>
              </section>
            )}
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
          </div>
          <DialogFooter className="border-t border-border bg-white px-5 py-4">
            <button type="button" onClick={requestClose} disabled={isSaving} className="min-h-11 rounded-2xl border border-border px-4 text-sm font-black text-ink/60 disabled:opacity-50">{t('livestock.cancel')}</button>
            <button type="button" onClick={() => void save()} disabled={isSaving} className="min-h-11 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-60">{isSaving ? t('livestock.saving') : t('livestock.saveChanges')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={next => { if (!next && !isDeleting) setPendingDelete(null); }}>
        <DialogContent className="max-w-md rounded-[26px]">
          <DialogHeader><DialogTitle>{t('livestock.deleteTitle')}</DialogTitle><DialogDescription>{batches.length === 1 ? t('livestock.deleteLastDescription', { name: fish.name }) : t('livestock.deleteDescription', { count: pendingDelete?.quantity ?? 0 })}</DialogDescription></DialogHeader>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
          <DialogFooter><button type="button" onClick={() => setPendingDelete(null)} disabled={isDeleting} className="min-h-11 rounded-2xl border border-border px-4 text-sm font-black disabled:opacity-50">{t('livestock.keep')}</button><button type="button" onClick={() => void confirmDelete()} disabled={isDeleting} className="min-h-11 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-60">{isDeleting ? t('livestock.removing') : t('livestock.deleteGroup')}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardConfirmOpen} onOpenChange={next => { setIsDiscardConfirmOpen(next); if (!next) setPendingNavigationPath(null); }}>
        <DialogContent className="max-w-md rounded-[26px]">
          <DialogHeader><DialogTitle>{t('livestock.discardTitle')}</DialogTitle><DialogDescription>{t('livestock.discardDescription')}</DialogDescription></DialogHeader>
          <DialogFooter><button type="button" onClick={() => setIsDiscardConfirmOpen(false)} className="min-h-11 rounded-2xl border border-border px-4 text-sm font-black">{t('livestock.continueEditing')}</button><button type="button" onClick={discardAndContinue} className="min-h-11 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white">{t('livestock.discard')}</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
