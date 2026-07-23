import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileImage, Loader2, Plus, Save, Send, XCircle } from 'lucide-react';
import {
  careArticleAdminInputSchema,
  speciesAdminInputSchema,
} from '../../packages/contracts/src/index';
import { useToast } from '../components/common/ToastProvider';
import {
  contentAdminService,
  type AdminCareArticleRecord,
  type AdminSpeciesRecord,
  type CareArticleAdminInput,
  type SpeciesAdminInput,
} from '../services/admin/content-admin.service';

type ContentType = 'species' | 'care';
type StatusAction = 'published' | 'archived';

const emptySpecies = (): SpeciesAdminInput => ({
  catalogKey: '', name: '', scientificName: '', category: '', difficulty: 'Easy',
  waterTemperatureText: '', phLevelText: '', waterChangeCycleDays: 7,
  description: '', diet: '', tankSizeText: '', temperament: 'Peaceful',
  sizeClass: 'Small', isCustom: false, searchTerms: [],
});

const emptyCare = (): CareArticleAdminInput => ({
  catalogKey: '', title: '', category: '', urgency: '日常', summary: '', symptoms: [],
  steps: [], avoidActions: [], observeItems: [], diagnoseWhen: [], nextStep: '', keywords: [],
});

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const lineText = (value: string[] | undefined) => (value || []).join('\n');
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作没有完成，请稍后重试。';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[12px] font-black text-ink/65"><span>{label}{required ? ' *' : ''}</span>{children}</label>;
}

const inputClass = 'min-h-11 w-full rounded-[14px] border border-border bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-ink/5';
const textareaClass = `${inputClass} min-h-[96px] resize-y py-3 leading-6`;

export default function AdminContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [type, setType] = useState<ContentType>('species');
  const [speciesItems, setSpeciesItems] = useState<AdminSpeciesRecord[]>([]);
  const [careItems, setCareItems] = useState<AdminCareArticleRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speciesForm, setSpeciesForm] = useState<SpeciesAdminInput>(emptySpecies);
  const [careForm, setCareForm] = useState<CareArticleAdminInput>(emptyCare);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const items = type === 'species' ? speciesItems : careItems;
  const selected = items.find(item => item.id === selectedId);

  const loadItems = async (nextType: ContentType = type, keepSelection = true) => {
    setIsLoading(true);
    setLoadError('');
    try {
      if (nextType === 'species') setSpeciesItems(await contentAdminService.listSpecies());
      else setCareItems(await contentAdminService.listCareArticles());
      if (!keepSelection) setSelectedId(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(type, false); }, [type]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  const selectItem = (item: AdminSpeciesRecord | AdminCareArticleRecord) => {
    if (isDirty && !window.confirm('当前修改尚未保存，确定切换内容吗？')) return;
    setSelectedId(item.id);
    setFormError('');
    setIsDirty(false);
    if (type === 'species') {
      const record = item as AdminSpeciesRecord;
      const { id: _id, status: _status, version: _version, speciesAssets: _assets, ...input } = record;
      setSpeciesForm(speciesAdminInputSchema.parse(input));
    } else {
      const record = item as AdminCareArticleRecord;
      const { id: _id, status: _status, version: _version, careArticleSteps, careArticleAssets: _assets, ...base } = record;
      setCareForm(careArticleAdminInputSchema.parse({
        ...base,
        steps: (careArticleSteps || []).sort((a, b) => a.position - b.position).map(step => ({ instruction: step.instruction, durationLabel: step.durationLabel })),
      }));
    }
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  };

  const startNew = () => {
    if (isDirty && !window.confirm('当前修改尚未保存，确定新建内容吗？')) return;
    setSelectedId(null);
    setSpeciesForm(emptySpecies());
    setCareForm(emptyCare());
    setFormError('');
    setIsDirty(false);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const parsed = type === 'species'
      ? speciesAdminInputSchema.safeParse(speciesForm)
      : careArticleAdminInputSchema.safeParse(careForm);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || '请检查必填内容。');
      firstFieldRef.current?.focus();
      return;
    }
    setIsSaving(true);
    try {
      if (type === 'species') {
        const record = selected as AdminSpeciesRecord | undefined;
        const saved = record
          ? await contentAdminService.updateSpecies(record.id, record.version, speciesForm)
          : await contentAdminService.createSpecies(speciesForm);
        setSelectedId(saved.id);
      } else {
        const record = selected as AdminCareArticleRecord | undefined;
        const saved = record
          ? await contentAdminService.updateCareArticle(record.id, record.version, careForm)
          : await contentAdminService.createCareArticle(careForm);
        setSelectedId(saved.id);
      }
      setIsDirty(false);
      showToast(selected ? '内容已保存' : '草稿已创建', 'success');
      await loadItems(type, true);
    } catch (error) {
      setFormError(errorMessage(error));
      showToast(errorMessage(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async () => {
    if (!pendingStatus || !selected) return;
    setIsSaving(true);
    try {
      await contentAdminService.setStatus(type, selected.id, selected.version, pendingStatus);
      showToast(pendingStatus === 'published' ? '内容已发布' : '内容已下线', 'success');
      setPendingStatus(null);
      await loadItems(type, true);
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file || !selected) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('请选择 PNG、JPEG 或 WebP 图片', 'error');
      return;
    }
    setIsUploading(true);
    try {
      await contentAdminService.uploadAsset(type, selected.id, file);
      showToast('图片已生成衍生版本并保存', 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadItems(type, true);
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const statusLabel = useMemo(() => selected?.status === 'published' ? '已发布' : selected?.status === 'archived' ? '已下线' : '草稿', [selected]);

  return (
    <div className="min-h-[100dvh] bg-[#e8efec] p-3 text-ink md:p-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="返回我的鱼缸" onClick={() => { if (!isDirty || window.confirm('当前修改尚未保存，确定离开吗？')) navigate('/aquarium'); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-border hover:bg-bg focus:outline-none focus:ring-2 focus:ring-emerald-300"><ArrowLeft className="h-5 w-5" /></button>
            <div><h1 className="text-xl font-black">内容后台</h1><p className="text-xs font-bold text-ink/45">编辑物种与养护资料，发布后才对用户可见。</p></div>
          </div>
          <div className="flex rounded-full bg-bg p-1">
            <button type="button" onClick={() => { if (!isDirty || window.confirm('当前修改尚未保存，确定切换栏目吗？')) setType('species'); }} className={`h-10 rounded-full px-4 text-sm font-black ${type === 'species' ? 'bg-accent text-white' : 'text-ink/55'}`}>物种</button>
            <button type="button" onClick={() => { if (!isDirty || window.confirm('当前修改尚未保存，确定切换栏目吗？')) setType('care'); }} className={`h-10 rounded-full px-4 text-sm font-black ${type === 'care' ? 'bg-accent text-white' : 'text-ink/55'}`}>养护文章</button>
          </div>
        </header>

        <main className="grid min-h-[calc(100dvh-130px)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-[24px] border border-white/80 bg-white p-3 shadow-sm" aria-label="内容列表">
            <button type="button" onClick={startNew} className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-accent text-sm font-black text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-emerald-300"><Plus className="h-4 w-4" />新建{type === 'species' ? '物种' : '文章'}</button>
            {isLoading ? <div className="grid gap-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-[72px] animate-pulse rounded-[16px] bg-ink/5" />)}</div>
              : loadError ? <div className="rounded-[18px] bg-red-50 p-4 text-sm font-bold text-red-700"><p>{loadError}</p><button type="button" onClick={() => void loadItems()} className="mt-3 h-10 rounded-full bg-red-700 px-4 text-white">重新加载</button></div>
              : items.length === 0 ? <div className="rounded-[18px] bg-bg p-5 text-center"><FileImage className="mx-auto h-8 w-8 text-ink/25" /><p className="mt-2 text-sm font-black">还没有内容</p><p className="mt-1 text-xs font-bold text-ink/45">先创建第一条草稿。</p></div>
              : <div className="grid max-h-[calc(100dvh-230px)] gap-2 overflow-y-auto pr-1">{items.map(item => <button key={item.id} type="button" onClick={() => selectItem(item)} className={`rounded-[16px] border p-3 text-left focus:outline-none focus:ring-2 focus:ring-emerald-300 ${selectedId === item.id ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:bg-bg'}`}><span className="block truncate text-sm font-black">{'name' in item ? item.name : item.title}</span><span className="mt-1 flex items-center justify-between text-[11px] font-bold text-ink/42"><span>{item.catalogKey}</span><span>{item.status === 'published' ? '已发布' : item.status === 'archived' ? '已下线' : '草稿'}</span></span></button>)}</div>}
          </section>

          <form onSubmit={save} className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div><div className="text-xs font-black text-emerald-700">{selected ? statusLabel : '新草稿'}</div><h2 className="mt-1 text-lg font-black">{selected ? ('name' in selected ? selected.name : selected.title) : `新建${type === 'species' ? '物种' : '养护文章'}`}</h2></div>
              <div className="flex flex-wrap gap-2">
                {selected && <><button type="button" disabled={isSaving || isDirty} onClick={() => setPendingStatus(selected.status === 'published' ? 'archived' : 'published')} className="h-10 rounded-full border border-border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45">{selected.status === 'published' ? '下线' : '发布'}</button><label className={`flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-black ${isUploading ? 'pointer-events-none opacity-50' : ''}`}><FileImage className="h-4 w-4" />{isUploading ? '上传中…' : '替换图片'}<input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => void upload(event.target.files?.[0])} disabled={isUploading} /></label></>}
                <button type="submit" disabled={isSaving || isUploading} className="flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? '保存中…' : selected ? '保存修改' : '创建草稿'}</button>
              </div>
            </div>

            {formError && <div role="alert" className="mb-4 rounded-[16px] bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{formError}</div>}
            {type === 'species' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="目录 ID" required><input ref={firstFieldRef} className={inputClass} value={speciesForm.catalogKey} disabled={Boolean(selected)} onChange={e => { setSpeciesForm(v => ({ ...v, catalogKey: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="中文名" required><input className={inputClass} value={speciesForm.name} onChange={e => { setSpeciesForm(v => ({ ...v, name: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="学名" required><input className={inputClass} value={speciesForm.scientificName} onChange={e => { setSpeciesForm(v => ({ ...v, scientificName: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="分类" required><input className={inputClass} value={speciesForm.category} onChange={e => { setSpeciesForm(v => ({ ...v, category: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="饲养难度"><select className={inputClass} value={speciesForm.difficulty} onChange={e => { setSpeciesForm(v => ({ ...v, difficulty: e.target.value as SpeciesAdminInput['difficulty'] })); setIsDirty(true); }}><option value="Easy">容易</option><option value="Medium">中等</option><option value="Hard">困难</option></select></Field>
                <Field label="性情"><select className={inputClass} value={speciesForm.temperament} onChange={e => { setSpeciesForm(v => ({ ...v, temperament: e.target.value as SpeciesAdminInput['temperament'] })); setIsDirty(true); }}><option value="Peaceful">温和</option><option value="Territorial">领地性</option><option value="Aggressive">攻击性</option></select></Field>
                <Field label="温度范围" required><input className={inputClass} placeholder="22-26°C" value={speciesForm.waterTemperatureText} onChange={e => { setSpeciesForm(v => ({ ...v, waterTemperatureText: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="pH 范围" required><input className={inputClass} placeholder="6.5-7.5" value={speciesForm.phLevelText} onChange={e => { setSpeciesForm(v => ({ ...v, phLevelText: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="鱼缸要求" required><input className={inputClass} value={speciesForm.tankSizeText} onChange={e => { setSpeciesForm(v => ({ ...v, tankSizeText: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="换水周期（天）" required><input type="number" min="1" className={inputClass} value={speciesForm.waterChangeCycleDays} onChange={e => { setSpeciesForm(v => ({ ...v, waterChangeCycleDays: Number(e.target.value) })); setIsDirty(true); }} /></Field>
                <Field label="体型"><select className={inputClass} value={speciesForm.sizeClass} onChange={e => { setSpeciesForm(v => ({ ...v, sizeClass: e.target.value as SpeciesAdminInput['sizeClass'] })); setIsDirty(true); }}><option value="Small">小型</option><option value="Medium">中型</option><option value="Large">大型</option></select></Field>
                <Field label="混养倾向"><select className={inputClass} value={speciesForm.housingMode || ''} onChange={e => { setSpeciesForm(v => ({ ...v, housingMode: (e.target.value || undefined) as SpeciesAdminInput['housingMode'] })); setIsDirty(true); }}><option value="">未设置</option><option value="适合混养">适合混养</option><option value="谨慎混养">谨慎混养</option><option value="建议单养">建议单养</option></select></Field>
                <div className="md:col-span-2"><Field label="物种说明" required><textarea className={textareaClass} value={speciesForm.description} onChange={e => { setSpeciesForm(v => ({ ...v, description: e.target.value })); setIsDirty(true); }} /></Field></div>
                <div className="md:col-span-2"><Field label="喂养说明" required><textarea className={textareaClass} value={speciesForm.diet} onChange={e => { setSpeciesForm(v => ({ ...v, diet: e.target.value })); setIsDirty(true); }} /></Field></div>
                <div className="md:col-span-2"><Field label="混养说明"><textarea className={textareaClass} value={speciesForm.housingReason || ''} onChange={e => { setSpeciesForm(v => ({ ...v, housingReason: e.target.value || undefined })); setIsDirty(true); }} /></Field></div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="目录 ID" required><input ref={firstFieldRef} className={inputClass} value={careForm.catalogKey} disabled={Boolean(selected)} onChange={e => { setCareForm(v => ({ ...v, catalogKey: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="标题" required><input className={inputClass} value={careForm.title} onChange={e => { setCareForm(v => ({ ...v, title: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="分类" required><input className={inputClass} value={careForm.category} onChange={e => { setCareForm(v => ({ ...v, category: e.target.value })); setIsDirty(true); }} /></Field>
                <Field label="优先级"><select className={inputClass} value={careForm.urgency} onChange={e => { setCareForm(v => ({ ...v, urgency: e.target.value as CareArticleAdminInput['urgency'] })); setIsDirty(true); }}><option value="日常">日常</option><option value="尽快处理">尽快处理</option><option value="高优先级">高优先级</option></select></Field>
                <div className="md:col-span-2"><Field label="摘要" required><textarea className={textareaClass} value={careForm.summary} onChange={e => { setCareForm(v => ({ ...v, summary: e.target.value })); setIsDirty(true); }} /></Field></div>
                <div className="md:col-span-2"><Field label="操作步骤（每行一步）" required><textarea className={`${textareaClass} min-h-[150px]`} value={careForm.steps.map(step => step.instruction).join('\n')} onChange={e => { setCareForm(v => ({ ...v, steps: lines(e.target.value).map((instruction, index) => ({ ...v.steps[index], instruction })) })); setIsDirty(true); }} /></Field></div>
                <Field label="适用症状（每行一项）"><textarea className={textareaClass} value={lineText(careForm.symptoms)} onChange={e => { setCareForm(v => ({ ...v, symptoms: lines(e.target.value) })); setIsDirty(true); }} /></Field>
                <Field label="禁止动作（每行一项）"><textarea className={textareaClass} value={lineText(careForm.avoidActions)} onChange={e => { setCareForm(v => ({ ...v, avoidActions: lines(e.target.value) })); setIsDirty(true); }} /></Field>
                <Field label="观察项（每行一项）"><textarea className={textareaClass} value={lineText(careForm.observeItems)} onChange={e => { setCareForm(v => ({ ...v, observeItems: lines(e.target.value) })); setIsDirty(true); }} /></Field>
                <Field label="需要进一步诊断（每行一项）"><textarea className={textareaClass} value={lineText(careForm.diagnoseWhen)} onChange={e => { setCareForm(v => ({ ...v, diagnoseWhen: lines(e.target.value) })); setIsDirty(true); }} /></Field>
                <div className="md:col-span-2"><Field label="下一步" required><textarea className={textareaClass} value={careForm.nextStep} onChange={e => { setCareForm(v => ({ ...v, nextStep: e.target.value })); setIsDirty(true); }} /></Field></div>
                <div className="md:col-span-2"><Field label="关键词（每行一项）"><textarea className={textareaClass} value={lineText(careForm.keywords)} onChange={e => { setCareForm(v => ({ ...v, keywords: lines(e.target.value) })); setIsDirty(true); }} /></Field></div>
              </div>
            )}
          </form>
        </main>
      </div>

      {pendingStatus && selected && <div className="fixed inset-0 z-[400] flex items-center justify-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-labelledby="status-dialog-title"><div className="w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-2xl"><h2 id="status-dialog-title" className="text-lg font-black">{pendingStatus === 'published' ? '确认发布' : '确认下线'}</h2><p className="mt-2 text-sm font-bold leading-6 text-ink/55">{pendingStatus === 'published' ? '发布后普通用户可以立即看到这项内容。' : '下线后普通用户将无法继续打开这项内容。'}</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={isSaving} onClick={() => setPendingStatus(null)} className="h-11 rounded-full border border-border px-5 text-sm font-black">取消</button><button type="button" disabled={isSaving} onClick={() => void updateStatus()} className={`flex h-11 items-center gap-2 rounded-full px-5 text-sm font-black text-white ${pendingStatus === 'archived' ? 'bg-red-700' : 'bg-accent'}`}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingStatus === 'published' ? <Send className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{isSaving ? '处理中…' : pendingStatus === 'published' ? '确认发布' : '确认下线'}</button></div></div></div>}
    </div>
  );
}
