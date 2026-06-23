export const TANK_LOAD_THRESHOLDS = {
  relaxed: 50,
  moderate: 75,
  nearLimit: 90,
} as const;

export const SPECIES_LOAD_MULTIPLIER = {
  waste: {
    low: 0.8,
    medium: 1,
    high: 1.35,
  },
  activity: {
    calm: 0.9,
    normal: 1,
    active: 1.2,
  },
  temperament: {
    peaceful: 1,
    territorial: 1.2,
    aggressive: 1.35,
  },
} as const;

export const TANK_CAPACITY_MULTIPLIER = {
  filter: {
    none: 0.62,
    sponge: 0.82,
    waterfall: 0.95,
    canister: 1.18,
    top: 1.08,
    default: 0.9,
  },
  waterChange: {
    overdue: 0.82,
    weekly: 1.08,
    unknown: 0.95,
  },
  oxygen: {
    enabled: 1.06,
    disabled: 1,
  },
  hardscapeOccupancy: {
    light: 0.96,
    dense: 0.9,
  },
} as const;

export const RECOMMENDATION_LIMITS = {
  direct: 8,
  adjustable: 8,
  blocked: 6,
  emptyPlans: 3,
} as const;
