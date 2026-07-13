import type { Aquarium, Fish } from '../src/types';
import { evaluateTankCompatibility, getTankCompatibilityAddPolicy } from '../src/lib/tankCompatibilityEngine';
import { evaluateCompatibilityDecision } from '../src/modules/knowledge/compatibilityKnowledge';
import { executeSpeciesAddition, reviewSpeciesAdditions } from '../src/services/aquarium/species-addition.service';

const makeFish = (overrides: Partial<Fish> = {}): Fish => ({
  id: 'peaceful-small-fish',
  name: '测试小型淡水鱼',
  scientificName: 'Testus freshwater',
  category: '淡水观赏鱼',
  image: '',
  difficulty: 'Easy',
  waterTemperature: '22-28°C',
  phLevel: '6.0-8.0',
  waterChangeCycle: 7,
  description: '和平的小型淡水鱼。',
  diet: '杂食',
  tankSize: '至少 20 升',
  temperament: 'Peaceful',
  size: 'Small',
  housingMode: '适合混养',
  ...overrides,
});

const makeTank = (overrides: Partial<Aquarium> = {}): Aquarium => ({
  id: 'test-tank',
  name: '测试鱼缸',
  fishes: [],
  dimensions: { length: '60', width: '30', height: '30' },
  waterType: 'Freshwater',
  targetTemperature: '25',
  equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
  ...overrides,
});

const cases: Array<{ name: string; run: () => boolean }> = [
  {
    name: 'compatibility statuses map to one add policy',
    run: () => (
      getTankCompatibilityAddPolicy('compatible') === 'allow'
      && getTankCompatibilityAddPolicy('caution') === 'confirm'
      && getTankCompatibilityAddPolicy('insufficient_data') === 'complete_information'
      && getTankCompatibilityAddPolicy('not_recommended') === 'block'
    ),
  },
  {
    name: 'freshwater tank blocks saltwater species',
    run: () => {
      const result = evaluateTankCompatibility({
        tank: makeTank(),
        candidateSpecies: makeFish({ id: 'saltwater-fish', name: '测试海水鱼', category: '海水观赏鱼' }),
      });
      return result.status === 'not_recommended'
        && result.blockingRules.some(rule => rule.code === 'water_type_mismatch');
    },
  },
  {
    name: 'missing tank dimensions and temperature is insufficient data',
    run: () => {
      const result = evaluateTankCompatibility({
        tank: makeTank({ dimensions: undefined, targetTemperature: undefined }),
        candidateSpecies: makeFish(),
      });
      return result.status === 'insufficient_data'
        && result.missingData.some(rule => /volume|temperature/.test(rule.code));
    },
  },
  {
    name: 'adjustable heater issue returns caution',
    run: () => {
      const result = evaluateTankCompatibility({
        tank: makeTank({ equipment: { filter: '瀑布过滤', heater: false, oxygen: false, light: '普通灯' } }),
        candidateSpecies: makeFish({ waterTemperature: '24-28°C' }),
      });
      return result.status === 'caution'
        && result.warningRules.some(rule => rule.code === 'heater_needed');
    },
  },
  {
    name: 'predator blocks a smaller candidate',
    run: () => {
      const predator = makeFish({
        id: 'large-predator',
        name: '测试大型掠食鱼',
        description: '会捕食小型鱼。',
        temperament: 'Aggressive',
        size: 'Large',
        tankSize: '至少 100 升',
      });
      const result = evaluateTankCompatibility({
        tank: makeTank({ dimensions: { length: '100', width: '50', height: '50' } }),
        existingSpecies: [{ species: predator, record: { quantity: 1 } }],
        candidateSpecies: makeFish(),
      });
      return result.status === 'not_recommended'
        && result.blockingRules.some(rule => rule.code === 'predation_risk');
    },
  },
  {
    name: 'pair result is independent of selection order',
    run: () => {
      const smallFish = makeFish();
      const predator = makeFish({
        id: 'order-test-predator',
        name: '顺序测试掠食鱼',
        description: '会捕食小型鱼。',
        temperament: 'Aggressive',
        size: 'Large',
        tankSize: '至少 100 升',
      });
      const tank = makeTank({ dimensions: { length: '100', width: '50', height: '50' } });
      const forward = evaluateCompatibilityDecision({
        tank,
        items: [{ species: smallFish, quantity: 1 }, { species: predator, quantity: 1 }],
      });
      const reverse = evaluateCompatibilityDecision({
        tank,
        items: [{ species: predator, quantity: 1 }, { species: smallFish, quantity: 1 }],
      });
      return forward.status === 'not_recommended'
        && reverse.status === 'not_recommended'
        && forward.blockingRules.some(rule => rule.code === 'predation_risk')
        && reverse.blockingRules.some(rule => rule.code === 'predation_risk');
    },
  },
  {
    name: 'direct engine, calculator decision, and addition review share one status',
    run: () => {
      const candidate = makeFish({ waterTemperature: '24-28°C' });
      const tank = makeTank({ equipment: { filter: '瀑布过滤', heater: false, oxygen: false, light: '普通灯' } });
      const direct = evaluateTankCompatibility({
        tank,
        candidateSpecies: candidate,
        candidateQuantity: 1,
      });
      const calculator = evaluateCompatibilityDecision({
        tank,
        items: [{ species: candidate, quantity: 1 }],
      });
      const addition = reviewSpeciesAdditions({
        aquarium: tank,
        items: [{ fishId: candidate.id, quantity: 1 }],
        speciesCatalog: [candidate],
      });
      return direct.status === 'caution'
        && calculator.status === direct.status
        && addition?.status === direct.status;
    },
  },
  {
    name: 'same species quantity counts toward load without self conflict',
    run: () => {
      const species = makeFish();
      const result = evaluateTankCompatibility({
        tank: makeTank({ dimensions: { length: '40', width: '25', height: '30' } }),
        existingSpecies: [{ species, record: { quantity: 10 } }],
        candidateSpecies: species,
        candidateQuantity: 10,
      });
      return result.status === 'not_recommended'
        && result.blockingRules.some(rule => rule.code === 'bioload_over_limit')
        && result.blockingRules.every(rule => !['territorial_conflict', 'single_housing_required'].includes(rule.code));
    },
  },
  {
    name: 'addition service blocks incompatible species before write',
    run: () => {
      const freshwater = makeFish();
      const saltwater = makeFish({ id: 'blocked-saltwater', category: '海水观赏鱼' });
      const tank = makeTank();
      const result = executeSpeciesAddition({
        aquariums: [tank],
        aquarium: tank,
        items: [{ fishId: saltwater.id, quantity: 1 }],
        speciesCatalog: [freshwater, saltwater],
      });
      return !result.added
        && result.reason === 'blocked'
        && result.aquariums[0].fishes.length === 0;
    },
  },
  {
    name: 'addition service requires caution confirmation',
    run: () => {
      const fish = makeFish({ waterTemperature: '24-28°C' });
      const tank = makeTank({ equipment: { filter: '瀑布过滤', heater: false, oxygen: false, light: '普通灯' } });
      const review = reviewSpeciesAdditions({
        aquarium: tank,
        items: [{ fishId: fish.id, quantity: 1 }],
        speciesCatalog: [fish],
      });
      const pending = executeSpeciesAddition({
        aquariums: [tank],
        aquarium: tank,
        items: [{ fishId: fish.id, quantity: 1 }],
        speciesCatalog: [fish],
      });
      const confirmed = executeSpeciesAddition({
        aquariums: [tank],
        aquarium: tank,
        items: [{ fishId: fish.id, quantity: 1 }],
        speciesCatalog: [fish],
        confirmedCaution: true,
      });
      return review?.policy === 'confirm'
        && pending.reason === 'confirmation_required'
        && confirmed.added
        && confirmed.aquariums[0].fishes[0]?.fishId === fish.id;
    },
  },
  {
    name: 'addition service merges quantity for existing species',
    run: () => {
      const fish = makeFish();
      const tank = makeTank({
        dimensions: { length: '120', width: '50', height: '50' },
        fishes: [{ id: 'existing', fishId: fish.id, quantity: 2, entryDate: '2026-01-01', lastWaterChangeDate: '2026-01-01' }],
      });
      const result = executeSpeciesAddition({
        aquariums: [tank],
        aquarium: tank,
        items: [{ fishId: fish.id, quantity: 2 }],
        speciesCatalog: [fish],
        confirmedCaution: true,
      });
      return result.added
        && result.aquariums[0].fishes.length === 1
        && result.aquariums[0].fishes[0].quantity === 4;
    },
  },
];

let failed = 0;
for (const testCase of cases) {
  if (testCase.run()) {
    console.log(`PASS ${testCase.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${testCase.name}`);
  }
}

if (failed > 0) process.exitCode = 1;
