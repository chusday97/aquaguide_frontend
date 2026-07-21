import type { AquariumFish, AquariumSpeciesBatch, LifeStage, ReproductiveState } from '../../types';

const createId = () => `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createSpeciesBatch = (input: {
  quantity: number;
  entryDate: string;
  lifeStage?: LifeStage;
  reproductiveState?: ReproductiveState;
  id?: string;
  stateUpdatedAt?: string;
}): AquariumSpeciesBatch => ({
  id: input.id ?? createId(),
  quantity: Math.max(1, Math.round(input.quantity || 1)),
  entryDate: input.entryDate,
  lifeStage: input.lifeStage ?? 'unknown',
  reproductiveState: input.reproductiveState ?? 'unknown',
  stateUpdatedAt: input.stateUpdatedAt ?? new Date().toISOString(),
});

export const normalizeSpeciesBatches = (record: AquariumFish): AquariumSpeciesBatch[] => {
  const valid = Array.isArray(record.batches)
    ? record.batches.filter(batch => batch && batch.id && Number(batch.quantity) > 0)
    : [];
  if (valid.length > 0) return valid.map(batch => createSpeciesBatch(batch));
  return [createSpeciesBatch({
    id: `${record.id}_legacy`,
    quantity: record.quantity,
    entryDate: record.entryDate,
    stateUpdatedAt: record.entryDate,
  })];
};

export const withNormalizedSpeciesBatches = (record: AquariumFish): AquariumFish => {
  const batches = normalizeSpeciesBatches(record);
  return {
    ...record,
    quantity: batches.reduce((sum, batch) => sum + batch.quantity, 0),
    entryDate: batches.map(batch => batch.entryDate).sort()[0] ?? record.entryDate,
    batches,
  };
};

export const appendSpeciesBatch = (record: AquariumFish, input: Parameters<typeof createSpeciesBatch>[0]) => withNormalizedSpeciesBatches({
  ...record,
  batches: [...normalizeSpeciesBatches(record), createSpeciesBatch(input)],
});

export const updateSpeciesBatch = (
  record: AquariumFish,
  batchId: string,
  patch: Partial<Pick<AquariumSpeciesBatch, 'quantity' | 'entryDate' | 'lifeStage' | 'reproductiveState'>>,
) => withNormalizedSpeciesBatches({
  ...record,
  batches: normalizeSpeciesBatches(record).map(batch => batch.id === batchId
    ? createSpeciesBatch({ ...batch, ...patch, id: batch.id, stateUpdatedAt: new Date().toISOString() })
    : batch),
});

export const splitSpeciesBatch = (
  record: AquariumFish,
  batchId: string,
  input: { quantity: number; lifeStage: LifeStage; reproductiveState: ReproductiveState; entryDate?: string },
) => {
  const batches = normalizeSpeciesBatches(record);
  const source = batches.find(batch => batch.id === batchId);
  const quantity = Math.round(input.quantity);
  if (!source) throw new Error('没有找到待拆分的批次。');
  if (quantity < 1 || quantity >= source.quantity) throw new Error('拆分数量必须小于原批次数量。');
  const now = new Date().toISOString();
  return withNormalizedSpeciesBatches({
    ...record,
    batches: [
      ...batches.map(batch => batch.id === batchId ? { ...batch, quantity: batch.quantity - quantity, stateUpdatedAt: now } : batch),
      createSpeciesBatch({
        quantity,
        entryDate: input.entryDate ?? source.entryDate,
        lifeStage: input.lifeStage,
        reproductiveState: input.reproductiveState,
        stateUpdatedAt: now,
      }),
    ],
  });
};

export const deleteSpeciesBatch = (record: AquariumFish, batchId: string) => {
  const remaining = normalizeSpeciesBatches(record).filter(batch => batch.id !== batchId);
  if (remaining.length === 0) return null;
  return withNormalizedSpeciesBatches({ ...record, batches: remaining });
};

export const summarizeSpeciesBatches = (record: AquariumFish) => {
  const batches = normalizeSpeciesBatches(record);
  const count = (predicate: (batch: AquariumSpeciesBatch) => boolean) => batches
    .filter(predicate)
    .reduce((sum, batch) => sum + batch.quantity, 0);
  return {
    total: count(() => true),
    juvenile: count(batch => batch.lifeStage === 'juvenile'),
    adult: count(batch => batch.lifeStage === 'adult'),
    pregnant: count(batch => batch.reproductiveState === 'pregnant_or_gravid'),
    spawning: count(batch => batch.reproductiveState === 'in_labor_or_spawning'),
    recovery: count(batch => batch.reproductiveState === 'postpartum_recovery'),
    unknown: count(batch => batch.lifeStage === 'unknown'),
  };
};

export const getSpeciesBatchContextLabel = (record: AquariumFish, isEn: boolean) => {
  const summary = summarizeSpeciesBatches(record);
  const parts: string[] = [];
  if (summary.juvenile) parts.push(isEn ? `${summary.juvenile} juvenile` : `幼年 ${summary.juvenile}`);
  if (summary.adult) parts.push(isEn ? `${summary.adult} adult` : `成年 ${summary.adult}`);
  if (summary.pregnant) parts.push(isEn ? `${summary.pregnant} pregnant/gravid` : `怀孕/抱卵 ${summary.pregnant}`);
  if (summary.spawning) parts.push(isEn ? `${summary.spawning} birthing/spawning` : `生产/繁殖 ${summary.spawning}`);
  if (summary.recovery) parts.push(isEn ? `${summary.recovery} recovering` : `产后恢复 ${summary.recovery}`);
  return parts.length > 0 ? parts.join(', ') : (isEn ? 'stage not recorded' : '体态未记录');
};

export const getSpeciesBatchObservation = (record: AquariumFish, isEn: boolean) => {
  const summary = summarizeSpeciesBatches(record);
  if (summary.spawning) return isEn ? 'Observe breathing, isolation, and whether birthing or spawning has finished.' : '观察呼吸、躲藏和生产/繁殖是否结束。';
  if (summary.pregnant) return isEn ? 'Watch appetite, chasing, hiding places, and signs of labor.' : '观察食欲、追咬、躲避空间和临产迹象。';
  if (summary.recovery) return isEn ? 'Watch appetite and energy while keeping water conditions stable.' : '观察食欲与活动量，保持水质稳定。';
  if (summary.juvenile) return isEn ? 'Check feeding access, growth, and whether larger tank mates are chasing them.' : '观察鱼苗是否吃得到、生长正常，以及是否被大鱼追咬。';
  return '';
};
