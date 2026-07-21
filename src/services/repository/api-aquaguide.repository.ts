import type { DiagnosisRecord } from '../../modules/diagnosis/diagnosis.types';
import type { Aquarium, AquariumFish, AquariumSpeciesBatch, DeceasedRecord } from '../../types';
import type { CareReminderRecord } from '../care/care-activity.service';
import { apiRequest, createIdempotencyKey } from '../api/api-client';
import type {
  AquaGuideRepository,
  CareReminderMutation,
  FavoriteMutation,
  MemorialSaveInput,
} from './aquaguide.repository';

type ApiAquariumSpecies = {
  id: string;
  speciesCatalogKey: string;
  quantity: number;
  entryDate: string;
  lastWaterChangeAt?: string;
  version: number;
  batches: ApiAquariumSpeciesBatch[];
};

type ApiAquariumSpeciesBatch = AquariumSpeciesBatch & { version: number };

type ApiAquarium = {
  id: string;
  name: string;
  waterType?: 'Freshwater' | 'Saltwater';
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  targetTemperatureC?: number;
  lastWaterChangeAt?: string;
  lastWaterStoredAt?: string;
  version: number;
  species: ApiAquariumSpecies[];
  equipment?: {
    id: string;
    filterType?: string;
    heater?: boolean;
    oxygen?: boolean;
    lightType?: string;
    version: number;
  };
  components: Array<{
    id: string;
    componentType: 'substrate' | 'plant' | 'hardscape';
    name: string;
    quantity?: number;
    version: number;
  }>;
};

type ApiDiagnosis = DiagnosisRecord & { id: string; version: number; localDate: string; diagnosisKey: string };
type ApiReminder = {
  id: string;
  sourceCatalogKey: string;
  title: string;
  reminderType: string;
  scheduledFor: string;
  aquariumId?: string;
  label?: string;
  completedAt?: string;
  createdAt: string;
  version: number;
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const toLegacyAquarium = (record: ApiAquarium): Aquarium => {
  const components = record.components || [];
  const substrate = components.find(item => item.componentType === 'substrate')?.name;
  const plants = components.filter(item => item.componentType === 'plant').map(item => item.name);
  const hardscape = components.filter(item => item.componentType === 'hardscape').map(item => item.name);
  return {
    id: record.id,
    name: record.name,
    fishes: (record.species || []).map<ApiAquariumFish>(item => ({
      id: item.id,
      fishId: item.speciesCatalogKey,
      quantity: item.quantity,
      entryDate: item.entryDate,
      lastWaterChangeDate: item.lastWaterChangeAt || record.lastWaterChangeAt || item.entryDate,
      batches: (item.batches || []).map(batch => ({
        id: batch.id,
        quantity: batch.quantity,
        entryDate: batch.entryDate,
        lifeStage: batch.lifeStage,
        reproductiveState: batch.reproductiveState,
        stateUpdatedAt: batch.stateUpdatedAt,
      })),
    })),
    lastWaterChangeDate: record.lastWaterChangeAt,
    lastWaterStoredDate: record.lastWaterStoredAt,
    dimensions: record.lengthCm && record.widthCm && record.heightCm
      ? { length: String(record.lengthCm), width: String(record.widthCm), height: String(record.heightCm) }
      : undefined,
    waterType: record.waterType,
    targetTemperature: record.targetTemperatureC == null ? undefined : String(record.targetTemperatureC),
    substrate,
    plants,
    hardscape,
    equipment: record.equipment ? {
      filter: record.equipment.filterType as NonNullable<Aquarium['equipment']>['filter'],
      heater: record.equipment.heater,
      oxygen: record.equipment.oxygen,
      light: record.equipment.lightType as NonNullable<Aquarium['equipment']>['light'],
    } : undefined,
  };
};

type ApiAquariumFish = AquariumFish;

export class ApiAquaGuideRepository implements AquaGuideRepository {
  private aquariumVersions = new Map<string, number>();
  private speciesVersions = new Map<string, number>();
  private reminderVersions = new Map<string, number>();
  private contentIds = new Map<string, string>();

  private rememberAquarium(record: ApiAquarium) {
    this.aquariumVersions.set(record.id, record.version);
    for (const item of record.species || []) this.speciesVersions.set(item.id, item.version);
    return toLegacyAquarium(record);
  }

  private async syncSpeciesBatches(aquariumId: string, current: ApiAquariumSpecies, desired: AquariumSpeciesBatch[]) {
    const currentById = new Map((current.batches || []).map(batch => [batch.id, batch]));
    const added = desired.filter(batch => !currentById.has(batch.id));
    const removed = (current.batches || []).filter(batch => !desired.some(item => item.id === batch.id));
    const reduced = desired
      .map(batch => ({ desired: batch, current: currentById.get(batch.id) }))
      .filter(item => item.current && item.desired.quantity < item.current.quantity);
    if (added.length === 1 && removed.length === 0 && reduced.length === 1) {
      const splitQuantity = reduced[0].current!.quantity - reduced[0].desired.quantity;
      if (splitQuantity === added[0].quantity) {
        await apiRequest(`/aquariums/${aquariumId}/species/${current.id}/batches/${reduced[0].current!.id}/split`, {
          method: 'POST',
          body: {
            quantity: added[0].quantity,
            entryDate: added[0].entryDate.slice(0, 10),
            lifeStage: added[0].lifeStage,
            reproductiveState: added[0].reproductiveState,
            sourceVersion: reduced[0].current!.version,
          },
          idempotencyKey: createIdempotencyKey('aquarium-species-batch-split'),
        });
        return;
      }
    }
    const retained = new Set<string>();
    for (const batch of desired) {
      const existing = currentById.get(batch.id);
      if (existing) {
        retained.add(existing.id);
        if (
          existing.quantity !== batch.quantity
          || existing.entryDate.slice(0, 10) !== batch.entryDate.slice(0, 10)
          || existing.lifeStage !== batch.lifeStage
          || existing.reproductiveState !== batch.reproductiveState
        ) {
          await apiRequest(`/aquariums/${aquariumId}/species/${current.id}/batches/${existing.id}`, {
            method: 'PATCH',
            body: {
              quantity: batch.quantity,
              entryDate: batch.entryDate.slice(0, 10),
              lifeStage: batch.lifeStage,
              reproductiveState: batch.reproductiveState,
              version: existing.version,
            },
            idempotencyKey: createIdempotencyKey('aquarium-species-batch-update'),
          });
        }
        continue;
      }
      const created = await apiRequest<ApiAquariumSpeciesBatch>(`/aquariums/${aquariumId}/species/${current.id}/batches`, {
        method: 'POST',
        body: {
          quantity: batch.quantity,
          entryDate: batch.entryDate.slice(0, 10),
          lifeStage: batch.lifeStage,
          reproductiveState: batch.reproductiveState,
        },
        idempotencyKey: createIdempotencyKey('aquarium-species-batch'),
      });
      retained.add(created.id);
    }
    for (const existing of current.batches || []) {
      if (!retained.has(existing.id)) {
        await apiRequest(`/aquariums/${aquariumId}/species/${current.id}/batches/${existing.id}?version=${existing.version}`, {
          method: 'DELETE',
          idempotencyKey: createIdempotencyKey('aquarium-species-batch-delete'),
        });
      }
    }
  }

  async getAquariums() {
    const records = await apiRequest<ApiAquarium[]>('/aquariums');
    return records.map(record => this.rememberAquarium(record));
  }

  async saveAquarium(aquarium: Aquarium) {
    const dimensions = aquarium.dimensions;
    const baseInput = {
      name: aquarium.name,
      waterType: aquarium.waterType,
      lengthCm: dimensions?.length ? Number(dimensions.length) : undefined,
      widthCm: dimensions?.width ? Number(dimensions.width) : undefined,
      heightCm: dimensions?.height ? Number(dimensions.height) : undefined,
      targetTemperatureC: aquarium.targetTemperature ? Number(aquarium.targetTemperature) : undefined,
      lastWaterChangeAt: aquarium.lastWaterChangeDate,
      lastWaterStoredAt: aquarium.lastWaterStoredDate,
    };

    const version = this.aquariumVersions.get(aquarium.id);
    let saved = version && isUuid(aquarium.id)
      ? await apiRequest<ApiAquarium>(`/aquariums/${aquarium.id}`, { method: 'PATCH', body: { ...baseInput, version }, idempotencyKey: createIdempotencyKey('aquarium-update') })
      : await apiRequest<ApiAquarium>('/aquariums', {
          method: 'POST',
          body: baseInput,
          idempotencyKey: createIdempotencyKey('aquarium'),
        });

    const currentById = new Map((saved.species || []).map(item => [item.id, item]));
    const currentByCatalogKey = new Map((saved.species || []).map(item => [item.speciesCatalogKey, item]));
    const retained = new Set<string>();

    for (const fish of aquarium.fishes) {
      const current = currentById.get(fish.id) || currentByCatalogKey.get(fish.fishId);
      if (current) {
        retained.add(current.id);
        const usesBatches = Boolean(fish.batches?.length);
        if ((!usesBatches && current.quantity !== fish.quantity) || current.entryDate !== fish.entryDate || current.lastWaterChangeAt !== fish.lastWaterChangeDate) {
          const updated = await apiRequest<ApiAquariumSpecies>(`/aquariums/${saved.id}/species/${current.id}`, {
            method: 'PATCH',
            body: {
              ...(!usesBatches ? { quantity: fish.quantity } : {}),
              entryDate: fish.entryDate.slice(0, 10),
              lastWaterChangeAt: fish.lastWaterChangeDate,
              version: current.version,
            },
            idempotencyKey: createIdempotencyKey('aquarium-species-update'),
          });
          this.speciesVersions.set(updated.id, updated.version);
        }
        if (usesBatches) await this.syncSpeciesBatches(saved.id, current, fish.batches!);
      } else {
        const desiredBatches = fish.batches || [];
        const initialBatch = desiredBatches[0];
        const created = await apiRequest<ApiAquariumSpecies>(`/aquariums/${saved.id}/species`, {
          method: 'POST',
          body: {
            speciesCatalogKey: fish.fishId,
            quantity: initialBatch?.quantity ?? fish.quantity,
            entryDate: (initialBatch?.entryDate ?? fish.entryDate).slice(0, 10),
            lastWaterChangeAt: fish.lastWaterChangeDate,
            lifeStage: initialBatch?.lifeStage,
            reproductiveState: initialBatch?.reproductiveState,
          },
          idempotencyKey: createIdempotencyKey('aquarium-species'),
        });
        retained.add(created.id);
        this.speciesVersions.set(created.id, created.version);
        for (const batch of desiredBatches.slice(1)) {
          await apiRequest(`/aquariums/${saved.id}/species/${created.id}/batches`, {
            method: 'POST',
            body: {
              quantity: batch.quantity,
              entryDate: batch.entryDate.slice(0, 10),
              lifeStage: batch.lifeStage,
              reproductiveState: batch.reproductiveState,
            },
            idempotencyKey: createIdempotencyKey('aquarium-species-batch'),
          });
        }
      }
    }

    for (const current of saved.species || []) {
      if (!retained.has(current.id)) {
        await apiRequest(`/aquariums/${saved.id}/species/${current.id}?version=${current.version}`, { method: 'DELETE', idempotencyKey: createIdempotencyKey('aquarium-species-delete') });
      }
    }

    if (aquarium.equipment) {
      await apiRequest(`/aquariums/${saved.id}/equipment`, {
        method: 'PUT',
        body: {
          filterType: aquarium.equipment.filter,
          heater: aquarium.equipment.heater,
          oxygen: aquarium.equipment.oxygen,
          lightType: aquarium.equipment.light,
          version: saved.equipment?.version,
        },
        idempotencyKey: createIdempotencyKey('aquarium-equipment'),
      });
    }

    saved = await apiRequest<ApiAquarium>(`/aquariums/${saved.id}`);
    return this.rememberAquarium(saved);
  }

  private async resolveContentId(type: 'species' | 'care', catalogKey: string) {
    const cacheKey = `${type}:${catalogKey}`;
    const cached = this.contentIds.get(cacheKey);
    if (cached) return cached;
    const path = type === 'species' ? `/species/${catalogKey}` : `/care-articles/${catalogKey}`;
    const content = await apiRequest<{ id: string }>(path, { authenticated: false });
    this.contentIds.set(cacheKey, content.id);
    return content.id;
  }

  async updateFavorite(input: FavoriteMutation) {
    const id = await this.resolveContentId(input.type, input.catalogKey);
    const path = `/favorites/${input.type}/${id}`;
    if (input.favorite) {
      await apiRequest(path, { method: 'PUT', idempotencyKey: createIdempotencyKey(`${input.type}-favorite`) });
    } else {
      await apiRequest(path, { method: 'DELETE', idempotencyKey: createIdempotencyKey(`${input.type}-favorite-delete`) });
    }
  }

  async saveDiagnosis(record: DiagnosisRecord) {
    const date = record.createdAt.slice(0, 10);
    const current = await apiRequest<ApiDiagnosis | null>(`/aquariums/${record.aquariumId}/daily-checks/${date}`);
    const saved = await apiRequest<ApiDiagnosis>(`/aquariums/${record.aquariumId}/daily-checks/${date}`, {
      method: 'PUT',
      idempotencyKey: createIdempotencyKey('daily-check'),
      body: {
        diagnosisKey: record.diagnosisId,
        problemType: record.problemType,
        sourceType: record.source?.type,
        sourceTitle: record.source?.title,
        answers: record.answers,
        structuredAnswers: record.structuredAnswers || [],
        resultSummary: record.resultSummary,
        riskLevel: record.riskLevel,
        riskCode: record.riskCode,
        conclusion: record.conclusion,
        keyMetrics: record.keyMetrics || [],
        suggestedActions: record.suggestedActions,
        avoidActions: record.avoidActions || [],
        observeItems: record.observeItems || [],
        missingInfo: record.missingInfo,
        optionalMissingInfo: record.optionalMissingInfo || [],
        nextCheckAt: record.nextCheckAt,
        followUpNotes: record.followUpNotes,
        version: current?.version,
      },
    });
    return { ...record, id: saved.id, diagnosisId: saved.diagnosisKey || record.diagnosisId };
  }

  async saveMemorial(input: MemorialSaveInput) {
    const saved = await apiRequest<{
      id: string;
      speciesCatalogKey: string;
      memorialDate: string;
      reason?: string;
    }>('/memorial-records', {
      method: 'POST',
      idempotencyKey: createIdempotencyKey('memorial'),
      body: {
        aquariumId: input.aquariumId && isUuid(input.aquariumId) ? input.aquariumId : undefined,
        speciesCatalogKey: input.speciesCatalogKey,
        memorialDate: input.date.slice(0, 10),
        reason: input.reason,
      },
    });
    return {
      id: saved.id,
      fishId: saved.speciesCatalogKey,
      date: new Date(`${saved.memorialDate}T12:00:00`).toISOString(),
      reason: saved.reason,
    } satisfies DeceasedRecord;
  }

  private rememberReminder(record: ApiReminder): CareReminderRecord {
    this.reminderVersions.set(record.id, record.version);
    return {
      id: record.id,
      sourceTopicId: record.sourceCatalogKey,
      title: record.title,
      type: record.reminderType,
      createdAt: record.createdAt,
      scheduledFor: record.scheduledFor,
      aquariumId: record.aquariumId,
      label: record.label,
      completedAt: record.completedAt,
    };
  }

  private async ensureReminderVersion(id: string) {
    const existing = this.reminderVersions.get(id);
    if (existing) return existing;
    const records = await apiRequest<ApiReminder[]>('/care-reminders');
    for (const record of records) this.reminderVersions.set(record.id, record.version);
    const version = this.reminderVersions.get(id);
    if (!version) throw new Error('没有找到这条养护计划。');
    return version;
  }

  async updateCareReminder(input: CareReminderMutation) {
    if (input.action === 'upsert') {
      const saved = await apiRequest<ApiReminder>('/care-reminders', {
        method: 'POST',
        idempotencyKey: createIdempotencyKey('care-reminder'),
        body: {
          aquariumId: input.record.aquariumId && isUuid(input.record.aquariumId) ? input.record.aquariumId : undefined,
          sourceCatalogKey: input.record.sourceTopicId,
          title: input.record.title,
          reminderType: input.record.type,
          scheduledFor: input.record.scheduledFor,
          label: input.record.label,
        },
      });
      return this.rememberReminder(saved);
    }

    const version = await this.ensureReminderVersion(input.id);
    if (input.action === 'delete') {
      await apiRequest(`/care-reminders/${input.id}?version=${version}`, { method: 'DELETE', idempotencyKey: createIdempotencyKey('care-reminder-delete') });
      this.reminderVersions.delete(input.id);
      return null;
    }

    const saved = await apiRequest<ApiReminder>(`/care-reminders/${input.id}`, {
      method: 'PATCH',
      body: input.action === 'complete'
        ? { completedAt: input.completedAt, version }
        : { scheduledFor: input.scheduledFor, label: input.label, version },
      idempotencyKey: createIdempotencyKey('care-reminder-update'),
    });
    return this.rememberReminder(saved);
  }
}
