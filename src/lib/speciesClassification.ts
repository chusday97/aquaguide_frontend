import { Fish } from '../types';

const aquaticPlantScientificPattern = /Hemianthus|Eleocharis|Utricularia|Bucephalandra|Anubias|Rotala|Vesicularia|Microsorum|Bolbitis|Cryptocoryne|Aponogeton|Lemna|Limnobium|Egeria|Nymphaea|Micranthemum|Echinodorus|Bacopa|Myriophyllum|Blyxa|Vallisneria/i;
const aquaticPlantNamePattern = /矮珍珠|牛毛毡|挖耳草|辣椒榕|水榕|迷你榕|宫廷草|红宫廷|绿宫廷|莫斯|铁皇冠|黑木蕨|椒草|大浪草|浮萍|圆心萍|蜈蚣草|睡莲|虎耳草|绿羽毛|箦藻|水兰|皇冠草|细叶皇冠/;
const nonPlantNamePattern = /孔雀鱼|草尾孔雀|红草鱼|恐龙鱼|珍珠马甲|珍珠虎|珍珠麒麟|珍珠神秘螺|珍珠米虾|皇冠黑白魟|雷龙|鱼$/;
const hardscapeScientificPattern = /Hardscape|Seiryu|Ohko|Lava|Driftwood|Aqua Soil|River Sand|Cosmetic Sand|Iwagumi|Bonsai Wood/i;
const hardscapeNamePattern = /青龙石|松皮石|火山石|沉木|流木|水草泥|溪流砂|化妆砂|景观板|景观组|景观树|底床/;

export const isAquaticPlantSpecies = (fish: Fish) => {
  const name = fish.name || '';
  const scientificName = fish.scientificName || '';
  const category = fish.category || '';

  if (category === '硬景/底床') return false;
  if (category === '水草' && !/水草泥|底床|硬景|沉木|石|砂/.test(name)) {
    return !nonPlantNamePattern.test(name);
  }
  if (/水草泥|底床|硬景|沉木|石|砂/.test(name + category)) return false;
  if (aquaticPlantScientificPattern.test(scientificName)) return true;
  return aquaticPlantNamePattern.test(name) && !nonPlantNamePattern.test(name);
};

export const isHardscapeSpecies = (fish: Fish) => {
  const name = fish.name || '';
  const scientificName = fish.scientificName || '';
  const text = `${name} ${scientificName} ${fish.category || ''}`;

  if (fish.category === '硬景/底床') return true;
  if (fish.category === '水草' && /水草泥|底床|硬景|沉木|石|砂/.test(name)) return true;
  if (hardscapeScientificPattern.test(scientificName)) return true;
  return /硬景|底床|Hardscape/i.test(text) && hardscapeNamePattern.test(name);
};

export const getAquariumPlantSpecies = (value: string, allSpecies: Fish[]) => {
  const plantSpecies = allSpecies.filter(isAquaticPlantSpecies);
  return (
    plantSpecies.find(plant => plant.id === value)
    || plantSpecies.find(plant => plant.name === value)
    || plantSpecies.find(plant => plant.name.includes(value) || value.includes(plant.name))
    || null
  );
};

export const getAquariumHardscapeSpecies = (value: string, allSpecies: Fish[]) => {
  const hardscapeSpecies = allSpecies.filter(isHardscapeSpecies);
  return (
    hardscapeSpecies.find(item => item.id === value)
    || hardscapeSpecies.find(item => item.name === value)
    || hardscapeSpecies.find(item => item.name.includes(value) || value.includes(item.name))
    || null
  );
};
