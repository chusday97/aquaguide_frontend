import { fishData } from '../data/fishData';
import { autoTranslations } from './localizeDataAuto';
import { careTopicsData } from '../data/careTopicsData';
import { careTranslations } from './localizeCareDataAuto';

export const categoryTranslations: Record<string, string> = {
  "两栖/爬宠": "Amphibians/Reptiles",
  "慈鲷/斗鱼": "Cichlids/Bettas",
  "水母": "Jellyfish",
  "水草": "Aquatic Plants",
  "海水鱼": "Marine Fish",
  "灯科鱼": "Tetras/Nano Fish",
  "珊瑚/海水无脊椎": "Corals/Invertebrates",
  "硬景/底床": "Hardscape/Substrate",
  "虾螺蟹": "Shrimps/Snails/Crabs",
  "鱼类": "Other Fish",
  "鲶鱼/异型": "Catfish/Plecos",
  "龟类": "Turtles",
};

export const housingModeTranslations: Record<string, string> = {
  "建议单养": "Single Specimen",
  "谨慎混养": "Caution Mix",
  "适合混养": "Compatible",
};

interface SpeciesTranslation {
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
}

export const englishTranslations: Record<string, SpeciesTranslation> = {
  "sp_0001": {
    name: "Fire Shrimp",
    description: "Very easy to breed, highly sensitive to copper-based medications and algaecides. Requires dense aquatic plants to provide shelter and hiding spots.",
    diet: "Omnivore/Scavenger: Algae + specialized shrimp/snail pellets + blanched vegetables. Frequency: 2-3 times per week in small amounts.",
    housingReason: "Peaceful temperament. Shrimps, snails, and crabs are generally gentle but can be preyed upon by medium-to-large or carnivorous fish. Avoid copper-based treatments.",
    feedingProfile: {
      feedingType: "Omnivore/Scavenger",
      recommendedFoods: "Algae + shrimp pellets + blanched vegetables",
      feedingFrequency: "2-3 times per week in small amounts",
      portionRule: "Eat within 2 hours, remove leftovers immediately",
      feedingLayer: "Bottom / Glass surfaces",
      avoidFoods: "Copper medications; old uneaten food; excessive animal protein",
      specialNotes: "Highly sensitive to water parameters and medications. Natural biofilm in established tanks is critical.",
    }
  },
  "sp_0002": {
    name: "Crystal Shrimp",
    description: "High-end species. Extremely sensitive to water temperature (temperatures over 26°C can trigger mass deaths). Active soil is required to maintain soft, slightly acidic water parameters.",
    diet: "Omnivore: Algae + blanched vegetables + premium shrimp pellets. Frequency: 2-3 times per week in small amounts.",
    housingReason: "Peaceful temperament. Shrimps, snails, and crabs are generally gentle but can be preyed upon by medium-to-large or carnivorous fish. Avoid copper-based treatments.",
    feedingProfile: {
      feedingType: "Omnivore",
      recommendedFoods: "Algae + blanched vegetables + shrimp pellets",
      feedingFrequency: "2-3 times per week in small amounts",
      portionRule: "Eat within 2 hours, remove leftovers immediately",
      feedingLayer: "Bottom layer",
      avoidFoods: "Copper medications; old uneaten food",
      specialNotes: "",
    }
  },
  "sp_0177": {
    name: "Angelfish",
    description: "Also known as Freshwater Angelfish. Tall tanks are highly recommended to accommodate their long flowing fins. They are generally peaceful but territorial, and will prey on tiny tetras.",
    diet: "Omnivore: Brine shrimp + high-quality flakes/pellets + bloodworms. Frequency: 1-2 times daily.",
    housingReason: "Angelfish are generally peaceful but territorial. Avoid housing them with active fin-nipping species or tiny tankmates that fit in their mouths.",
    feedingProfile: {
      feedingType: "Omnivore",
      recommendedFoods: "Brine shrimp + high-quality flakes/pellets + bloodworms",
      feedingFrequency: "1-2 times daily",
      portionRule: "Eat within 3-5 minutes",
      feedingLayer: "Midwater / Surface",
      avoidFoods: "Low-quality generic food; excessive freeze-dried bloodworms",
      specialNotes: "Angelfish enjoy varied diets. Increase protein ratios during breeding seasons.",
    }
  },
  "sp_0260": {
    name: "Crowntail Betta (Red Black)",
    description: "3D Interactive Experiment Species. Males are extremely aggressive towards conspecifics. Must be kept singly or divided. Long delicate crowntail rays require smooth decorations to prevent injury.",
    diet: "Carnivore: Premium betta pellets + freeze-dried brine shrimp/bloodworms. Frequency: 1-2 times daily in small, controlled portions.",
    housingReason: "Highly aggressive temperament. Bettas (especially males) will fight to the death if cohoused with other bettas or colorful, long-finned fish. Keep water currents gentle.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Betta pellets + freeze-dried brine shrimp/bloodworms",
      feedingFrequency: "1-2 times daily",
      portionRule: "3-5 grains per feeding, control strictly to avoid bloating",
      feedingLayer: "Surface / Midwater",
      avoidFoods: "Large pellets; high-carbohydrate fish foods",
      specialNotes: "Bettas have small stomachs. Feed in small amounts and ensure water flow is slow so they can eat comfortably.",
    }
  },
  "sp_0261": {
    name: "Dumbo Ear Halfmoon Betta",
    description: "Features oversized pectoral fins resembling elephant ears and a 180-degree halfmoon tail. Due to their heavy fins, water flow must be extremely gentle to prevent tears and physical exhaustion.",
    diet: "Carnivore: Betta pellets + live/frozen brine shrimp. Frequency: 1-2 times daily.",
    housingReason: "Highly aggressive towards other bettas. Their slow movement due to heavy fins makes them easy targets for fin-nipping fish (e.g. Tiger Barbs). Keep singly.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Specialized betta pellets + brine shrimp",
      feedingFrequency: "1-2 times daily",
      portionRule: "3-4 grains per feeding, adjust based on activity",
      feedingLayer: "Surface / Midwater",
      avoidFoods: "Hard uneaten food; flake food",
      specialNotes: "Dumbo fins are fragile. Avoid sharp tank decorations.",
    }
  },
  "sp_0262": {
    name: "Blue Dragon Plakat Betta",
    description: "Short-tailed Plakat variety. Robust, active, and highly energetic. The Blue Dragon strain features metallic blue body scales contrasted with vibrant red fins.",
    diet: "Carnivore: High-protein betta pellets + bloodworms. Frequency: 1-2 times daily.",
    housingReason: "Extremely aggressive. Best kept in a single specimen tank. Short fins make them faster and more agile, meaning they are slightly less prone to nipping, but caution is still required.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Betta pellets + bloodworms",
      feedingFrequency: "1-2 times daily",
      portionRule: "4-5 grains per feeding",
      feedingLayer: "Surface / Midwater",
      avoidFoods: "Overfeeding; low-quality flakes",
      specialNotes: "Highly active, requires slightly more protein than long-finned varieties.",
    }
  },
  "sp_0389": {
    name: "Platinum Halfmoon Betta",
    description: "Features a stunning, flawless metallic platinum-white body and fins. Tail spreads into a full 180-degree halfmoon shape. Highly eye-catching in dark-scaped aquariums.",
    diet: "Carnivore: Premium betta pellets + freeze-dried brine shrimp. Frequency: 1-2 times daily.",
    housingReason: "Highly aggressive. White fins stand out dramatically against dark backgrounds. Ensure all rockwork and hardscape is completely smooth to avoid tearing white finnage.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Betta pellets + freeze-dried brine shrimp",
      feedingFrequency: "1-2 times daily",
      portionRule: "3-4 grains per feeding",
      feedingLayer: "Surface",
      avoidFoods: "Generic low-cost fish food",
      specialNotes: "White fish are highly prone to visual fin defects. Maintain pristine water quality.",
    }
  },
  "sp_0390": {
    name: "Red White Crowntail Betta",
    description: "Red and white body pattern. Spiky rays spread outwards in a crown-like shape. Requires highly stable water chemistry to prevent bacterial infections and fin rot.",
    diet: "Carnivore: Specialized betta pellets + live/frozen brine shrimp. Frequency: 1-2 times daily.",
    housingReason: "Highly aggressive. Delicate spiky crown rays tear easily; avoid cohousing and sharp hardscapes.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Betta pellets + brine shrimp",
      feedingFrequency: "1-2 times daily",
      portionRule: "3-4 grains per feeding",
      feedingLayer: "Surface / Midwater",
      avoidFoods: "Hard uneaten food",
      specialNotes: "Crown rays require stable mineral balance in water to prevent curling.",
    }
  },
  "sp_0391": {
    name: "Blue Dragon Plakat Betta (Selected)",
    description: "Premium short-tail Plakat variety. Highly active and ornamental, featuring dense metallic blue-silver dragon scales contrasted with bright red fins.",
    diet: "Carnivore: Specialized betta pellets + micro freeze-dried food. Frequency: 1-2 times daily.",
    housingReason: "Highly aggressive. Avoid tankmates with similar colorful patterns or long fins. Best kept in a single specimen tank.",
    feedingProfile: {
      feedingType: "Carnivore",
      recommendedFoods: "Betta pellets + micro freeze-dried food",
      feedingFrequency: "1-2 times daily",
      portionRule: "4-5 grains per feeding",
      feedingLayer: "Surface / Midwater",
      avoidFoods: "Overfeeding; low-quality flakes",
      specialNotes: "",
    }
  },
  "sp_0392": {
    name: "Red Devil Angelfish",
    description: "Color variety of Freshwater Angelfish featuring rich red pigmentation. Color-enhancing food rich in astaxanthin is highly recommended to maintain their deep color.",
    diet: "Omnivore: Brine shrimp + high-quality flakes + freeze-dried bloodworms. Frequency: 1-2 times daily.",
    housingReason: "Angelfish are generally peaceful but territorial. Avoid housing them with active fin-nipping species or tiny tankmates that fit in their mouths.",
    feedingProfile: {
      feedingType: "Omnivore",
      recommendedFoods: "Brine shrimp + flakes + bloodworms",
      feedingFrequency: "1-2 times daily",
      portionRule: "Eat within 3 minutes",
      feedingLayer: "Midwater / Surface",
      avoidFoods: "Low-quality generic pellets",
      specialNotes: "Astaxanthin-rich feed is crucial for maintaining vibrant red colors.",
    }
  },
  "sp_0396": {
    name: "Platinum Longfin Angelfish",
    description: "Elegant pure white longfin angelfish. Features a brilliant metallic platinum shine. Requires tall and spacious aquariums to display its long fins comfortably.",
    diet: "Omnivore: Premium fish pellets + frozen brine shrimp. Frequency: 1-2 times daily.",
    housingReason: "Delicate long fins are highly prone to nipping. Do not house with aggressive or active nippers like Tiger Barbs or Zebra Danios.",
    feedingProfile: {
      feedingType: "Omnivore",
      recommendedFoods: "Premium pellets + brine shrimp",
      feedingFrequency: "1-2 times daily",
      portionRule: "Eat within 3 minutes",
      feedingLayer: "Midwater",
      avoidFoods: "Hard dry foods",
      specialNotes: "",
    }
  },
  "sp_0459": {
    name: "Grass Shrimp",
    description: "The most classic algae-eating shrimp. Efficiently cleans hair algae and brown diatoms in aquariums. Slightly more resilient than crystal shrimp.",
    diet: "Omnivore/Scavenger: Algae + leftover fish food. Feeding is generally unnecessary as they graze on natural biofilms.",
    housingReason: "Peaceful temperament. Shrimps, snails, and crabs are generally gentle but can be preyed upon by medium-to-large or carnivorous fish. Avoid copper-based treatments.",
    feedingProfile: {
      feedingType: "Omnivore/Scavenger",
      recommendedFoods: "Algae + leftover food",
      feedingFrequency: "Self-sufficient, generally no feeding required",
      portionRule: "Grazes continuously on tank biofilm",
      feedingLayer: "Bottom / Plants",
      avoidFoods: "Copper medications",
      specialNotes: "Essential for planted tanks to control hair algae and diatoms.",
    }
  }
};

export const applyLocalization = (lng: string) => {
  const isEn = lng === 'en';
  
  fishData.forEach(fish => {
    // 1. Initialize original cache if not exists
    if (!(fish as any)._originalName) {
      (fish as any)._originalName = fish.name;
      (fish as any)._originalCategory = fish.category;
      (fish as any)._originalHousingMode = fish.housingMode;
      (fish as any)._originalTankSize = fish.tankSize;
      (fish as any)._originalDescription = fish.description;
      (fish as any)._originalDiet = fish.diet;
      (fish as any)._originalHousingReason = fish.housingReason;
      
      if (fish.feedingProfile) {
        (fish as any)._originalFeedingType = fish.feedingProfile.feedingType;
        (fish as any)._originalRecommendedFoods = fish.feedingProfile.recommendedFoods;
        (fish as any)._originalFeedingFrequency = fish.feedingProfile.feedingFrequency;
        (fish as any)._originalPortionRule = fish.feedingProfile.portionRule;
        (fish as any)._originalFeedingLayer = fish.feedingProfile.feedingLayer;
        (fish as any)._originalAvoidFoods = fish.feedingProfile.avoidFoods;
        (fish as any)._originalSpecialNotes = fish.feedingProfile.specialNotes;
      }
    }

    if (isEn) {
      const stripEnPrefix = (str: string | undefined) => str ? str.replace(/^(?:\[EN\]\s*)+/gi, '').trim() : '';

      // Apply English Translation
      const translation = englishTranslations[fish.id] || autoTranslations[fish.id];
      
      // Name Fallback: translation name -> scientificName -> originalName
      const rawName = translation?.name || fish.scientificName || (fish as any)._originalName;
      fish.name = stripEnPrefix(rawName);
      
      // Category translation mapping
      fish.category = categoryTranslations[(fish as any)._originalCategory] || (fish as any)._originalCategory;
      
      // HousingMode translation mapping
      fish.housingMode = housingModeTranslations[(fish as any)._originalHousingMode] || (fish as any)._originalHousingMode;
      
      // Tank size translation (e.g. "至少 30 升" -> "At least 30 L")
      let tSize = (fish as any)._originalTankSize || "";
      tSize = tSize.replace(/至少/g, "At least").replace(/升/g, " L").replace(/缸/g, " Tank");
      fish.tankSize = tSize;

      // Description, Diet, and HousingReason fallback
      if (translation) {
        fish.description = stripEnPrefix(translation.description);
        fish.diet = stripEnPrefix(translation.diet);
        fish.housingReason = stripEnPrefix(translation.housingReason);
        
        if (fish.feedingProfile && translation.feedingProfile) {
          fish.feedingProfile.feedingType = translation.feedingProfile.feedingType || fish.feedingProfile.feedingType;
          fish.feedingProfile.recommendedFoods = translation.feedingProfile.recommendedFoods || fish.feedingProfile.recommendedFoods;
          fish.feedingProfile.feedingFrequency = translation.feedingProfile.feedingFrequency || fish.feedingProfile.feedingFrequency;
          fish.feedingProfile.portionRule = translation.feedingProfile.portionRule || fish.feedingProfile.portionRule;
          fish.feedingProfile.feedingLayer = translation.feedingProfile.feedingLayer || fish.feedingProfile.feedingLayer;
          fish.feedingProfile.avoidFoods = translation.feedingProfile.avoidFoods || fish.feedingProfile.avoidFoods;
          fish.feedingProfile.specialNotes = translation.feedingProfile.specialNotes || fish.feedingProfile.specialNotes;
        }
      } else {
        // Fallback for untranslated species
        fish.description = `Care requirements: temperature ${fish.waterTemperature}, pH ${fish.phLevel}. Water changes: once every ${fish.waterChangeCycle} days.`;
        fish.diet = `Diet type: ${fish.feedingProfile?.dietType || 'Omnivore'}. Standard food: ${fish.feedingProfile?.recommendedFoods || 'Generic feed'}.`;
        fish.housingReason = `Compatibility behavior: ${fish.housingMode}. Ensure compatible tank parameters.`;
        
        if (fish.feedingProfile) {
          // Translate feeding layer dynamically
          let layer = (fish as any)._originalFeedingLayer || "";
          layer = layer.replace(/底层/g, "Bottom").replace(/中层/g, "Midwater").replace(/顶层/g, "Surface").replace(/缸壁/g, "Glass");
          fish.feedingProfile.feedingLayer = layer;
          
          fish.feedingProfile.feedingType = fish.feedingProfile.dietType || "Omnivore";
          fish.feedingProfile.feedingFrequency = "1-2 times daily";
          fish.feedingProfile.portionRule = "Eat within 3 minutes";
          fish.feedingProfile.avoidFoods = "Overfeeding; uneaten leftovers";
          fish.feedingProfile.specialNotes = "Maintain clean, stable water conditions.";
        }
      }
    } else {
      // Restore Chinese original values
      fish.name = (fish as any)._originalName;
      fish.category = (fish as any)._originalCategory;
      fish.housingMode = (fish as any)._originalHousingMode;
      fish.tankSize = (fish as any)._originalTankSize;
      fish.description = (fish as any)._originalDescription;
      fish.diet = (fish as any)._originalDiet;
      fish.housingReason = (fish as any)._originalHousingReason;
      
      if (fish.feedingProfile) {
        fish.feedingProfile.feedingType = (fish as any)._originalFeedingType;
        fish.feedingProfile.recommendedFoods = (fish as any)._originalRecommendedFoods;
        fish.feedingProfile.feedingFrequency = (fish as any)._originalFeedingFrequency;
        fish.feedingProfile.portionRule = (fish as any)._originalPortionRule;
        fish.feedingProfile.feedingLayer = (fish as any)._originalFeedingLayer;
        fish.feedingProfile.avoidFoods = (fish as any)._originalAvoidFoods;
        fish.feedingProfile.specialNotes = (fish as any)._originalSpecialNotes;
      }
    }
  });

  // 3. Localize careTopicsData
  careTopicsData.forEach(topic => {
    // Initialize original cache if not exists
    if (!(topic as any)._originalTitle) {
      (topic as any)._originalTitle = topic.title;
      (topic as any)._originalCategory = topic.category;
      (topic as any)._originalUrgency = topic.urgency;
      (topic as any)._originalSummary = topic.summary;
      (topic as any)._originalSymptoms = [...topic.symptoms];
      (topic as any)._originalFirstSteps = [...topic.firstSteps];
      (topic as any)._originalAvoid = [...topic.avoid];
      (topic as any)._originalObserve = [...topic.observe];
      (topic as any)._originalDiagnoseWhen = [...topic.diagnoseWhen];
      (topic as any)._originalNextStep = topic.nextStep;
      (topic as any)._originalKeywords = [...topic.keywords];
    }

    if (isEn) {
      const trans = careTranslations[topic.id];
      topic.title = trans?.title || (topic as any)._originalTitle;
      topic.category = trans?.category || (topic as any)._originalCategory;
      topic.urgency = (trans?.urgency || (topic as any)._originalUrgency) as any;
      topic.summary = trans?.summary || (topic as any)._originalSummary;
      topic.symptoms = trans?.symptoms || (topic as any)._originalSymptoms;
      topic.firstSteps = trans?.firstSteps || (topic as any)._originalFirstSteps;
      topic.avoid = trans?.avoid || (topic as any)._originalAvoid;
      topic.observe = trans?.observe || (topic as any)._originalObserve;
      topic.diagnoseWhen = trans?.diagnoseWhen || (topic as any)._originalDiagnoseWhen;
      topic.nextStep = trans?.nextStep || (topic as any)._originalNextStep;
      topic.keywords = trans?.keywords || (topic as any)._originalKeywords;
    } else {
      topic.title = (topic as any)._originalTitle;
      topic.category = (topic as any)._originalCategory;
      topic.urgency = (topic as any)._originalUrgency;
      topic.summary = (topic as any)._originalSummary;
      topic.symptoms = (topic as any)._originalSymptoms;
      topic.firstSteps = (topic as any)._originalFirstSteps;
      topic.avoid = (topic as any)._originalAvoid;
      topic.observe = (topic as any)._originalObserve;
      topic.diagnoseWhen = (topic as any)._originalDiagnoseWhen;
      topic.nextStep = (topic as any)._originalNextStep;
      topic.keywords = (topic as any)._originalKeywords;
    }
  });
};

export const getLocalizedAquariumName = (name: string | undefined, isEn: boolean): string => {
  if (!name) return isEn ? 'My Aquarium' : '我的鱼缸';
  if (isEn) {
    return name.replace(/^我的鱼缸/g, 'My Aquarium');
  }
  return name;
};
