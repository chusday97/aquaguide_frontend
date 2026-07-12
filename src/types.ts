export interface Fish {
  id: string;
  name: string;
  scientificName: string;
  category: string;
  image: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  waterTemperature: string;
  phLevel: string;
  waterChangeCycle: number; // in days
  description: string;
  diet: string;
  feedingProfile?: {
    dietType?: string;
    feedingType: string;
    recommendedFoods: string;
    feedingFrequency: string;
    portionRule: string;
    feedingLayer?: string;
    avoidFoods: string;
    specialNotes?: string;
    confidence?: string;
    sourceName?: string;
    sourceUrl?: string;
    sourceFields?: string[];
    needsReview?: boolean;
    reviewReason?: string;
  };
  tankSize: string;
  temperament: 'Peaceful' | 'Aggressive' | 'Territorial';
  size: 'Small' | 'Medium' | 'Large';
  housingMode?: '适合混养' | '谨慎混养' | '建议单养';
  housingReason?: string;
  isCustom?: boolean;
}

export interface AquariumFish {
  id: string;
  fishId: string;
  quantity: number;
  entryDate: string; // ISO string
  lastWaterChangeDate: string; // ISO string
}

export interface Aquarium {
  id: string;
  name: string;
  fishes: AquariumFish[];
  lastWaterChangeDate?: string;
  waterChangeHistory?: string[];
  lastWaterStoredDate?: string;
  dimensions?: { length: string; width: string; height: string };
  waterType?: 'Freshwater' | 'Saltwater';
  targetTemperature?: string;
  substrate?: string;
  plants?: string[];
  hardscape?: string[];
  equipment?: {
    filter?: '无' | '瀑布过滤' | '桶滤' | '上滤' | '海绵过滤';
    heater?: boolean;
    oxygen?: boolean;
    light?: '无' | '普通灯' | '水草灯' | '海水灯';
  };
}

export interface DeceasedRecord {
  id: string;
  fishId: string;
  date: string;
  reason?: string;
}
