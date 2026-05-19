import { databaseService } from '../../services/database/database.service';
import { loggerService } from '../../services/logger/logger.service';
import {
  aquariumListOutputSchema,
  aquariumReadInputSchema,
  aquariumSaveInputSchema,
  aquariumSchema,
  AquariumListOutput,
  AquariumSaveOutput,
} from './aquarium.schema';

const table = 'aquariums';

export const aquariumService = {
  list: (input: unknown): AquariumListOutput => {
    const parsed = aquariumReadInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({ module: 'aquarium', action: 'list', message: 'Aquarium list input failed schema validation', details: parsed.error.flatten() });
      return { aquariums: [] };
    }

    return databaseService.read({ table, key: parsed.data.userId }, aquariumListOutputSchema, { aquariums: [] });
  },

  save: (input: unknown): AquariumSaveOutput | null => {
    const parsed = aquariumSaveInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({ module: 'aquarium', action: 'save', message: 'Aquarium save input failed schema validation', details: parsed.error.flatten() });
      return null;
    }

    const current = aquariumService.list({ userId: parsed.data.userId });
    const nextAquariums = [
      ...current.aquariums.filter((item) => item.id !== parsed.data.aquarium.id),
      parsed.data.aquarium,
    ];
    const ok = databaseService.write({ table, key: parsed.data.userId, value: { aquariums: nextAquariums } }, aquariumListOutputSchema);
    if (!ok) return null;

    loggerService.info({ module: 'aquarium', action: 'save', message: 'Aquarium saved', details: { aquariumId: parsed.data.aquarium.id } });
    return { aquarium: aquariumSchema.parse(parsed.data.aquarium) };
  },
};

