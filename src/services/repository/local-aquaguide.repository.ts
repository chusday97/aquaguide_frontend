import type { DiagnosisRecord } from '../../modules/diagnosis/diagnosis.types';
import type { Aquarium } from '../../types';
import {
  completeCareReminder,
  deleteCareReminder,
  rescheduleCareReminder,
  upsertCareReminder,
} from '../care/care-activity.service';
import { recordSpeciesMemorial } from '../collection/memorial.service';
import { persistDiagnosisRecords, upsertDiagnosisRecord } from '../diagnosis/diagnosis-records.service';
import {
  addSpeciesFavorite,
  getCareFavorites,
  getSpeciesFavoriteIds,
  setCareFavorites,
  setSpeciesFavoriteIds,
} from '../favorites/favorites.service';
import { loadAppStateFromStorage } from '../storage/local-app-state';
import { persistAquariums } from '../aquarium/aquarium-state.service';
import type {
  AquaGuideRepository,
  CareReminderMutation,
  FavoriteMutation,
  MemorialSaveInput,
} from './aquaguide.repository';

export class LocalAquaGuideRepository implements AquaGuideRepository {
  async getAquariums() {
    return loadAppStateFromStorage().aquariums;
  }

  async saveAquarium(aquarium: Aquarium) {
    const state = loadAppStateFromStorage();
    const exists = state.aquariums.some(item => item.id === aquarium.id);
    const aquariums = exists
      ? state.aquariums.map(item => item.id === aquarium.id ? aquarium : item)
      : [...state.aquariums, aquarium];
    return persistAquariums(aquariums, aquarium.id).aquariums.find(item => item.id === aquarium.id)!;
  }

  async updateFavorite(input: FavoriteMutation) {
    if (input.type === 'species') {
      if (input.favorite) addSpeciesFavorite(input.catalogKey);
      else setSpeciesFavoriteIds(getSpeciesFavoriteIds().filter(id => id !== input.catalogKey));
      return;
    }
    const favorites = getCareFavorites();
    if (input.favorite) favorites[input.catalogKey] = { id: input.catalogKey, title: input.title, favoritedAt: new Date().toISOString() };
    else delete favorites[input.catalogKey];
    setCareFavorites(favorites);
  }

  async saveDiagnosis(record: DiagnosisRecord) {
    const current = loadAppStateFromStorage().diagnosisRecords as DiagnosisRecord[];
    persistDiagnosisRecords(upsertDiagnosisRecord(current, record));
    return record;
  }

  async saveMemorial(input: MemorialSaveInput) {
    return recordSpeciesMemorial({ fishId: input.speciesCatalogKey, date: input.date, reason: input.reason }).record;
  }

  async updateCareReminder(input: CareReminderMutation) {
    if (input.action === 'upsert') return upsertCareReminder(input.record);
    if (input.action === 'complete') return completeCareReminder(input.id, input.completedAt);
    if (input.action === 'reschedule') return rescheduleCareReminder(input.id, input.scheduledFor, input.label);
    deleteCareReminder(input.id);
    return null;
  }
}
