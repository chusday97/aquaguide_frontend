import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// 1. Mock browser environment globals for importing index.ts
Object.defineProperty(global, 'window', {
  value: {},
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      lang: ''
    }
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    language: 'en'
  },
  writable: true,
  configurable: true
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function translateText(text: string, retries = 5, delayMs = 1000): Promise<string> {
  if (!text || typeof text !== 'string') return '';
  const queryText = text.trim();
  if (!queryText) return '';

  for (let i = 0; i < retries; i++) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(queryText)}`;
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn(`Rate limit hit (429). Retrying in ${delayMs * 2}ms...`);
        await delay(delayMs * 2);
        delayMs *= 2;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = (await res.json()) as any;
      const translated = data[0].map((x: any) => x[0]).join('');
      return translated;
    } catch (error) {
      if (i === retries - 1) {
        console.warn(`Translation failed for: "${text}". Using fallback prefix.`, error);
        return `[EN] ${text}`;
      }
      await delay(delayMs);
    }
  }
  return `[EN] ${text}`;
}

async function translateArray(arr: string[]): Promise<string[]> {
  if (!arr) return [];
  const res: string[] = [];
  for (const item of arr) {
    res.push(await translateText(item));
    await delay(100);
  }
  return res;
}


async function syncUIObjects(zhObj: any, enObj: any): Promise<boolean> {
  let changed = false;
  for (const key of Object.keys(zhObj)) {
    const zhVal = zhObj[key];
    if (typeof zhVal === 'object' && zhVal !== null) {
      if (!enObj[key] || typeof enObj[key] !== 'object') {
        enObj[key] = {};
        changed = true;
      }
      const childChanged = await syncUIObjects(zhVal, enObj[key]);
      if (childChanged) changed = true;
    } else {
      if (enObj[key] === undefined || enObj[key] === null || enObj[key] === '') {
        console.log(`[UI Sync] Translating key: ${key} -> "${zhVal}"`);
        enObj[key] = await translateText(zhVal);
        await delay(150);
        changed = true;
      }
    }
  }
  return changed;
}

function pruneUIKeys(zhObj: any, enObj: any): boolean {
  let changed = false;
  for (const key of Object.keys(enObj)) {
    if (zhObj[key] === undefined) {
      console.log(`[UI Sync] Pruning removed key: ${key}`);
      delete enObj[key];
      changed = true;
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null) {
      if (typeof zhObj[key] === 'object' && zhObj[key] !== null) {
        const childChanged = pruneUIKeys(zhObj[key], enObj[key]);
        if (childChanged) changed = true;
      } else {
        delete enObj[key];
        changed = true;
      }
    }
  }
  return changed;
}

async function main() {
  console.log('Starting AquaGuide localization synchronization audit...');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Paths
  const rootDir = path.resolve(__dirname, '..');
  const indexTsPath = path.join(rootDir, 'src', 'i18n', 'index.ts');
  const localizeDataAutoPath = path.join(rootDir, 'src', 'i18n', 'localizeDataAuto.ts');
  const localizeCareDataAutoPath = path.join(rootDir, 'src', 'i18n', 'localizeCareDataAuto.ts');

  // A. Dynamically load modules to inspect current runtime values
  const i18nModule = await import('../src/i18n/index');
  const i18n = i18nModule.default;
  const { fishData } = await import('../src/data/fishData');
  const { englishTranslations } = await import('../src/i18n/localizeData');
  const { autoTranslations } = await import('../src/i18n/localizeDataAuto');
  const { careTopicsData } = await import('../src/data/careTopicsData');
  const { categoryTranslations } = await import('../src/i18n/localizeData');

  let careTranslations: Record<string, any> = {};
  if (fs.existsSync(localizeCareDataAutoPath)) {
    try {
      const careModule = await import('../src/i18n/localizeCareDataAuto');
      careTranslations = careModule.careTranslations || {};
    } catch {
      // Ignored
    }
  }

  // B. Sync UI Translation keys in src/i18n/index.ts
  console.log('\n--- Auditing UI resources in index.ts ---');
  const zhUI = JSON.parse(JSON.stringify(i18n.getResourceBundle('zh-CN', 'translation')));
  const enUI = JSON.parse(JSON.stringify(i18n.getResourceBundle('en', 'translation')));

  const uiAdded = await syncUIObjects(zhUI, enUI);
  const uiPruned = pruneUIKeys(zhUI, enUI);

  if (uiAdded || uiPruned) {
    console.log('[UI Sync] Detected translation changes. Updating index.ts...');
    const originalContent = fs.readFileSync(indexTsPath, 'utf8');

    // Extract resources block: const resources = { ... } as const;
    const resourcesRegex = /const resources = \{[\s\S]+?\} as const;/;
    const updatedResources = {
      'zh-CN': {
        translation: zhUI
      },
      en: {
        translation: enUI
      }
    };
    
    // Convert to formatted JavaScript object literal
    const newResourcesStr = `const resources = ${JSON.stringify(updatedResources, null, 2)} as const;`;
    const updatedContent = originalContent.replace(resourcesRegex, newResourcesStr);
    fs.writeFileSync(indexTsPath, updatedContent, 'utf8');
    console.log('[UI Sync] index.ts updated successfully.');
  } else {
    console.log('[UI Sync] index.ts is already fully synchronized.');
  }

  // C. Sync Species Data in src/data/fishData.ts -> src/i18n/localizeDataAuto.ts
  console.log('\n--- Auditing species data in fishData.ts ---');
  let autoTranslationsChanged = false;
  const updatedAutoTranslations = { ...autoTranslations };

  const translateAll = process.argv.includes('--all');
  const maxTranslations = translateAll ? Infinity : 5;
  let translatedCount = 0;

  for (const fish of fishData) {
    // Skip if high-fidelity manual translation exists
    if (englishTranslations[fish.id]) {
      // If it exists in auto-translations, remove it to keep auto-translations clean
      if (updatedAutoTranslations[fish.id]) {
        delete updatedAutoTranslations[fish.id];
        autoTranslationsChanged = true;
      }
      continue;
    }

    // Compute hash of source Chinese content to detect changes
    const chsContent = [
      fish.name,
      fish.description,
      fish.diet,
      fish.housingReason,
      fish.feedingProfile ? JSON.stringify(fish.feedingProfile) : ''
    ].join('|||');
    const currentHash = computeHash(chsContent);

    // If missing or hash mismatched, trigger translation
    const existingAuto = autoTranslations[fish.id];
    if (!existingAuto || existingAuto._srcHash !== currentHash) {
      if (translatedCount >= maxTranslations) {
        continue;
      }

      console.log(`[Species Sync] Translating fish: ${fish.id} (${fish.name})`);
      
      const translatedName = await translateText(fish.name);
      const translatedDesc = await translateText(fish.description);
      const translatedDiet = await translateText(fish.diet);
      const translatedHousing = await translateText(fish.housingReason);
      
      let feedingProfileTrans = undefined;
      if (fish.feedingProfile) {
        feedingProfileTrans = {
          feedingType: fish.feedingProfile.feedingType ? await translateText(fish.feedingProfile.feedingType) : undefined,
          recommendedFoods: fish.feedingProfile.recommendedFoods ? await translateText(fish.feedingProfile.recommendedFoods) : undefined,
          feedingFrequency: fish.feedingProfile.feedingFrequency ? await translateText(fish.feedingProfile.feedingFrequency) : undefined,
          portionRule: fish.feedingProfile.portionRule ? await translateText(fish.feedingProfile.portionRule) : undefined,
          feedingLayer: fish.feedingProfile.feedingLayer ? await translateText(fish.feedingProfile.feedingLayer) : undefined,
          avoidFoods: fish.feedingProfile.avoidFoods ? await translateText(fish.feedingProfile.avoidFoods) : undefined,
          specialNotes: fish.feedingProfile.specialNotes ? await translateText(fish.feedingProfile.specialNotes) : undefined,
        };
        await delay(150);
      }

      updatedAutoTranslations[fish.id] = {
        name: translatedName,
        description: translatedDesc,
        diet: translatedDiet,
        housingReason: translatedHousing,
        ...(feedingProfileTrans ? { feedingProfile: feedingProfileTrans } : {}),
        _srcHash: currentHash
      };
      autoTranslationsChanged = true;
      translatedCount++;
      await delay(200);
    }
  }

  if (translatedCount > 0) {
    console.log(`[Species Sync] Translated ${translatedCount} species in this run.`);
  }

  const remainingCount = fishData.filter(fish => {
    if (englishTranslations[fish.id]) return false;
    const chsContent = [
      fish.name,
      fish.description,
      fish.diet,
      fish.housingReason,
      fish.feedingProfile ? JSON.stringify(fish.feedingProfile) : ''
    ].join('|||');
    const hash = computeHash(chsContent);
    return !autoTranslations[fish.id] || autoTranslations[fish.id]._srcHash !== hash;
  }).length;

  if (remainingCount > 0 && !translateAll) {
    console.log(`[Species Sync] Note: ${remainingCount} species translations are still outdated or missing. Run with '--all' flag (npm run i18n:sync -- --all) to translate all remaining.`);
  }


  // Prune any deleted species from auto-translations
  const validFishIds = new Set(fishData.map(f => f.id));
  for (const id of Object.keys(updatedAutoTranslations)) {
    if (!validFishIds.has(id)) {
      console.log(`[Species Sync] Pruning removed species translation: ${id}`);
      delete updatedAutoTranslations[id];
      autoTranslationsChanged = true;
    }
  }

  if (autoTranslationsChanged) {
    console.log('[Species Sync] Detected species translation updates. Saving localizeDataAuto.ts...');
    const fileContent = `export const autoTranslations: Record<string, {
  name: string;
  description: string;
  diet: string;
  housingReason: string;
  feedingProfile?: {
    feedingType?: string;
    recommendedFoods?: string;
    feedingFrequency?: string;
    portionRule?: string;
    feedingLayer?: string;
    avoidFoods?: string;
    specialNotes?: string;
  };
  _srcHash?: string;
}> = ${JSON.stringify(updatedAutoTranslations, null, 2)};
`;
    fs.writeFileSync(localizeDataAutoPath, fileContent, 'utf8');
    console.log('[Species Sync] localizeDataAuto.ts updated successfully.');
  } else {
    console.log('[Species Sync] localizeDataAuto.ts is already fully synchronized.');
  }

  // D. Sync Care Topics Data in src/data/careTopicsData.ts -> src/i18n/localizeCareDataAuto.ts
  console.log('\n--- Auditing care topics in careTopicsData.ts ---');
  let careTranslationsChanged = false;
  const updatedCareTranslations = { ...careTranslations };

  for (const topic of careTopicsData) {
    // Compute hash of source Chinese content
    const chsContent = [
      topic.title,
      topic.category,
      topic.urgency,
      topic.summary,
      topic.symptoms.join('|||'),
      topic.firstSteps.join('|||'),
      topic.avoid.join('|||'),
      topic.observe.join('|||'),
      topic.diagnoseWhen.join('|||'),
      topic.nextStep,
      topic.keywords.join('|||')
    ].join('===');
    const currentHash = computeHash(chsContent);

    const existingTrans = careTranslations[topic.id];
    if (!existingTrans || existingTrans._srcHash !== currentHash) {
      if (translatedCount >= maxTranslations) {
        continue;
      }

      console.log(`[Care Sync] Translating topic: ${topic.id} (${topic.title})`);

      const translatedTitle = await translateText(topic.title);
      const translatedCategory = categoryTranslations[topic.category] || await translateText(topic.category);
      const translatedUrgency = topic.urgency === '日常' ? 'Routine' : topic.urgency === '尽快处理' ? 'Urgent' : 'High Priority';
      const translatedSummary = await translateText(topic.summary);
      const translatedSymptoms = await translateArray(topic.symptoms);
      const translatedFirstSteps = await translateArray(topic.firstSteps);
      const translatedAvoid = await translateArray(topic.avoid);
      const translatedObserve = await translateArray(topic.observe);
      const translatedDiagnoseWhen = await translateArray(topic.diagnoseWhen);
      const translatedNextStep = await translateText(topic.nextStep);
      const translatedKeywords = await translateArray(topic.keywords);

      updatedCareTranslations[topic.id] = {
        title: translatedTitle,
        category: translatedCategory,
        urgency: translatedUrgency,
        summary: translatedSummary,
        symptoms: translatedSymptoms,
        firstSteps: translatedFirstSteps,
        avoid: translatedAvoid,
        observe: translatedObserve,
        diagnoseWhen: translatedDiagnoseWhen,
        nextStep: translatedNextStep,
        keywords: translatedKeywords,
        _srcHash: currentHash
      };
      careTranslationsChanged = true;
      translatedCount++;
      await delay(200);
    }
  }

  if (careTranslationsChanged) {
    console.log('[Care Sync] Detected care translation updates. Saving localizeCareDataAuto.ts...');
    const fileContent = `export const careTranslations: Record<string, {
  title: string;
  category: string;
  urgency: string;
  summary: string;
  symptoms: string[];
  firstSteps: string[];
  avoid: string[];
  observe: string[];
  diagnoseWhen: string[];
  nextStep: string;
  keywords: string[];
  _srcHash?: string;
}> = ${JSON.stringify(updatedCareTranslations, null, 2)};
`;
    fs.writeFileSync(localizeCareDataAutoPath, fileContent, 'utf8');
    console.log('[Care Sync] localizeCareDataAuto.ts updated successfully.');
  } else {
    console.log('[Care Sync] localizeCareDataAuto.ts is already fully synchronized.');
  }

  console.log('\nLocalization synchronization complete!');
}

main().catch(error => {
  console.error('Localization synchronization failed:', error);
  process.exit(1);
});
