import type {
  BrewCalcInput,
  BrewCalcResult,
  BrewMethodId,
  MethodConfig,
} from './types';

export const METHOD_CONFIGS: Record<BrewMethodId, MethodConfig> = {
  v60: {
    id: 'v60',
    name: 'V60 / Pour-Over',
    defaultRatio: 16,
    ratioRange: [10, 25],
    strengthRatios: {
      light: 17,
      balanced: 16,
      strong: 15,
    },
    defaultBloomRatio: 3,
    defaultBloomTimeSec: 45,
    recommendedGrind: 'Medium-Fine (Table Salt to Sand)',
    defaultBrewTimeSec: 210, // 3:30
    waterTemp: '198°F - 205°F (92°C - 96°C)',
  },
  french_press: {
    id: 'french_press',
    name: 'French Press',
    defaultRatio: 15,
    ratioRange: [10, 20],
    strengthRatios: {
      light: 16,
      balanced: 15,
      strong: 13,
    },
    defaultBloomRatio: 2,
    defaultBloomTimeSec: 30,
    recommendedGrind: 'Coarse (Kosher Salt)',
    defaultBrewTimeSec: 240, // 4:00
    waterTemp: '200°F - 205°F (93°C - 96°C)',
  },
  aeropress: {
    id: 'aeropress',
    name: 'AeroPress',
    defaultRatio: 13,
    ratioRange: [8, 18],
    strengthRatios: {
      light: 15,
      balanced: 13,
      strong: 11,
    },
    defaultBloomRatio: 2.5,
    defaultBloomTimeSec: 30,
    recommendedGrind: 'Medium-Fine',
    defaultBrewTimeSec: 120, // 2:00
    waterTemp: '185°F - 195°F (85°C - 90°C)',
  },
  chemex: {
    id: 'chemex',
    name: 'Chemex',
    defaultRatio: 15,
    ratioRange: [12, 18],
    strengthRatios: {
      light: 16.5,
      balanced: 15,
      strong: 14,
    },
    defaultBloomRatio: 3,
    defaultBloomTimeSec: 45,
    recommendedGrind: 'Medium-Coarse (Rough Sand)',
    defaultBrewTimeSec: 240, // 4:00
    waterTemp: '198°F - 205°F (92°C - 96°C)',
  },
  drip_machine: {
    id: 'drip_machine',
    name: 'Auto Drip / Batch Brewer',
    defaultRatio: 16,
    ratioRange: [12, 18],
    strengthRatios: {
      light: 17,
      balanced: 16,
      strong: 15,
    },
    defaultBloomRatio: 0,
    defaultBloomTimeSec: 0,
    recommendedGrind: 'Medium (Sand)',
    defaultBrewTimeSec: 300, // 5:00
    waterTemp: '195°F - 205°F (91°C - 96°C)',
  },
  cold_brew: {
    id: 'cold_brew',
    name: 'Cold Brew (Immersion)',
    defaultRatio: 8,
    ratioRange: [4, 15],
    strengthRatios: {
      light: 10,
      balanced: 8,
      strong: 6,
    },
    defaultBloomRatio: 0,
    defaultBloomTimeSec: 0,
    recommendedGrind: 'Extra Coarse (Cracked Peppercorn)',
    defaultBrewTimeSec: 43200, // 12 hours
    waterTemp: 'Chilled / Filtered Room Temp (40°F - 68°F / 4°C - 20°C)',
  },
  vietnamese_phin: {
    id: 'vietnamese_phin',
    name: 'Vietnamese Phin Drip',
    defaultRatio: 4.5,
    ratioRange: [3, 7],
    strengthRatios: {
      light: 5.5,
      balanced: 4.5,
      strong: 3.5,
    },
    defaultBloomRatio: 1.5,
    defaultBloomTimeSec: 60,
    recommendedGrind: 'Medium (Fine Sand)',
    defaultBrewTimeSec: 300, // 5:00
    waterTemp: '200°F - 208°F (94°C - 98°C)',
  },
  espresso: {
    id: 'espresso',
    name: 'Espresso',
    defaultRatio: 2,
    ratioRange: [1.5, 3],
    strengthRatios: {
      light: 2.5, // Lungo
      balanced: 2.0, // Normale
      strong: 1.5, // Ristretto
    },
    defaultBloomRatio: 0,
    defaultBloomTimeSec: 0,
    recommendedGrind: 'Fine (Powder/Flour)',
    defaultBrewTimeSec: 28,
    waterTemp: '195°F - 200°F (90°C - 93°C)',
  },
  custom: {
    id: 'custom',
    name: 'Custom Method',
    defaultRatio: 15,
    ratioRange: [2, 30],
    strengthRatios: {
      light: 17,
      balanced: 15,
      strong: 13,
    },
    defaultBloomRatio: 2.5,
    defaultBloomTimeSec: 30,
    recommendedGrind: 'User Preference',
    defaultBrewTimeSec: 180,
    waterTemp: '195°F - 205°F (90°C - 96°C)',
  },
};

export const WATER_ABSORPTION_FACTOR = 2.1; // 2.1g of water retained per 1g dry coffee grounds
const GRAMS_TO_OZ = 0.035274;
const ML_TO_FL_OZ = 0.033814;

export function getMethodConfig(method: BrewMethodId): MethodConfig {
  return METHOD_CONFIGS[method] || METHOD_CONFIGS.custom;
}

function formatTime(totalSec: number): string {
  if (totalSec >= 3600) {
    const hours = Math.floor(totalSec / 3600);
    return `${hours} hrs`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateBrew(input: BrewCalcInput): BrewCalcResult {
  const config = getMethodConfig(input.method);

  // 1. Determine effective ratio
  let effectiveRatio = config.defaultRatio;
  if (input.customRatio !== undefined && !Number.isNaN(input.customRatio)) {
    effectiveRatio = input.customRatio;
  } else if (input.strength) {
    effectiveRatio = config.strengthRatios[input.strength] ?? config.defaultRatio;
  }

  // Clamp ratio to method range
  effectiveRatio = Math.max(config.ratioRange[0], Math.min(config.ratioRange[1], effectiveRatio));

  const rawAmount = Math.max(0, input.amount || 0);

  let coffeeGrams = 0;
  let waterGrams = 0;

  if (rawAmount > 0) {
    if (input.mode === 'by_coffee') {
      coffeeGrams = rawAmount;
      waterGrams = coffeeGrams * effectiveRatio;
    } else if (input.mode === 'by_water') {
      waterGrams = rawAmount;
      coffeeGrams = effectiveRatio > 0 ? waterGrams / effectiveRatio : 0;
    } else if (input.mode === 'by_yield') {
      const targetYield = rawAmount;
      // Equation: Yield = Water - (Coffee * 2.1)
      // Since Water = Coffee * effectiveRatio:
      // Yield = Coffee * (effectiveRatio - 2.1)
      const denominator = effectiveRatio - WATER_ABSORPTION_FACTOR;
      if (denominator > 0) {
        coffeeGrams = targetYield / denominator;
        waterGrams = coffeeGrams * effectiveRatio;
      } else {
        coffeeGrams = targetYield / effectiveRatio;
        waterGrams = targetYield;
      }
    }
  }

  // Round values
  coffeeGrams = Math.round(coffeeGrams * 10) / 10;
  waterGrams = Math.round(waterGrams * 10) / 10;

  const waterRetentionGrams = Math.round(coffeeGrams * WATER_ABSORPTION_FACTOR * 10) / 10;
  const estimatedYieldMl = Math.max(0, Math.round((waterGrams - waterRetentionGrams) * 10) / 10);

  // Imperial unit conversions
  const coffeeOz = Math.round(coffeeGrams * GRAMS_TO_OZ * 100) / 100;
  const waterOz = Math.round(waterGrams * ML_TO_FL_OZ * 10) / 10;
  const estimatedYieldOz = Math.round(estimatedYieldMl * ML_TO_FL_OZ * 10) / 10;

  // Bloom calculation
  let bloomWaterGrams = Math.round(coffeeGrams * config.defaultBloomRatio * 10) / 10;
  if (bloomWaterGrams > waterGrams) {
    bloomWaterGrams = waterGrams;
  }

  return {
    methodId: config.id,
    methodName: config.name,
    coffeeGrams,
    coffeeOz,
    waterGrams,
    waterOz,
    ratio: Math.round(effectiveRatio * 10) / 10,
    ratioText: `1:${Math.round(effectiveRatio * 10) / 10}`,
    estimatedYieldMl,
    estimatedYieldOz,
    bloomWaterGrams,
    bloomTimeSec: config.defaultBloomTimeSec,
    recommendedGrind: config.recommendedGrind,
    targetBrewTimeSec: config.defaultBrewTimeSec,
    targetBrewTimeText: formatTime(config.defaultBrewTimeSec),
    waterTemp: config.waterTemp,
    waterRetentionGrams,
  };
}
