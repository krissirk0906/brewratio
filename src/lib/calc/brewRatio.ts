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
    recommendedGrind: 'Medium-Fine (Muối biển nhỏ)',
    defaultBrewTimeSec: 210, // 3:30
    waterTempC: '92°C - 96°C',
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
    recommendedGrind: 'Coarse (Muối hạt to)',
    defaultBrewTimeSec: 240, // 4:00
    waterTempC: '93°C - 96°C',
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
    waterTempC: '85°C - 90°C',
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
    recommendedGrind: 'Medium-Coarse (Đá xay thô)',
    defaultBrewTimeSec: 240, // 4:00
    waterTempC: '92°C - 96°C',
  },
  cold_brew: {
    id: 'cold_brew',
    name: 'Cold Brew (Ủ lạnh)',
    defaultRatio: 8,
    ratioRange: [4, 15],
    strengthRatios: {
      light: 10,
      balanced: 8,
      strong: 6,
    },
    defaultBloomRatio: 0,
    defaultBloomTimeSec: 0,
    recommendedGrind: 'Extra Coarse (Siêu thô)',
    defaultBrewTimeSec: 43200, // 12 hours
    waterTempC: 'Nước lọc nguội / Nước lạnh (4°C - 20°C)',
  },
  vietnamese_phin: {
    id: 'vietnamese_phin',
    name: 'Phin Truyền Thống Việt Nam',
    defaultRatio: 4.5,
    ratioRange: [3, 7],
    strengthRatios: {
      light: 5.5,
      balanced: 4.5,
      strong: 3.5,
    },
    defaultBloomRatio: 1.5, // Châm đáy và ủ mặt 20-30ml
    defaultBloomTimeSec: 60,
    recommendedGrind: 'Medium (Cát mịn)',
    defaultBrewTimeSec: 300, // 5:00
    waterTempC: '94°C - 98°C',
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
    recommendedGrind: 'Fine (Mịn bột)',
    defaultBrewTimeSec: 28,
    waterTempC: '90°C - 93°C',
  },
  custom: {
    id: 'custom',
    name: 'Tùy chỉnh cá nhân',
    defaultRatio: 15,
    ratioRange: [2, 30],
    strengthRatios: {
      light: 17,
      balanced: 15,
      strong: 13,
    },
    defaultBloomRatio: 2.5,
    defaultBloomTimeSec: 30,
    recommendedGrind: 'Tùy chọn',
    defaultBrewTimeSec: 180,
    waterTempC: '90°C - 96°C',
  },
};

export const WATER_ABSORPTION_FACTOR = 2.1; // 2.1g of water absorbed per 1g dry coffee

export function getMethodConfig(method: BrewMethodId): MethodConfig {
  return METHOD_CONFIGS[method] || METHOD_CONFIGS.custom;
}

function formatTime(totalSec: number): string {
  if (totalSec >= 3600) {
    const hours = Math.floor(totalSec / 3600);
    return `${hours} giờ`;
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
      coffeeGrams = waterGrams / effectiveRatio;
    } else if (input.mode === 'by_yield') {
      // Yield = Water - (Coffee * Absorption) = (Coffee * Ratio) - (Coffee * Absorption) = Coffee * (Ratio - Absorption)
      const netMultiplier = effectiveRatio - WATER_ABSORPTION_FACTOR;
      if (netMultiplier > 0) {
        coffeeGrams = rawAmount / netMultiplier;
        waterGrams = coffeeGrams * effectiveRatio;
      } else {
        coffeeGrams = rawAmount;
        waterGrams = rawAmount * effectiveRatio;
      }
    }
  }

  const roundedCoffee = Math.round(coffeeGrams * 10) / 10;
  const roundedWater = Math.round(waterGrams * 10) / 10;
  const waterRetention = Math.round(roundedCoffee * WATER_ABSORPTION_FACTOR * 10) / 10;
  const estimatedYield = Math.max(0, Math.round((roundedWater - waterRetention) * 10) / 10);
  const bloomWater = Math.round(roundedCoffee * config.defaultBloomRatio * 10) / 10;

  return {
    methodId: config.id,
    methodName: config.name,
    coffeeGrams: roundedCoffee,
    waterGrams: roundedWater,
    ratio: effectiveRatio,
    ratioText: `1:${effectiveRatio}`,
    estimatedYieldMl: estimatedYield,
    bloomWaterGrams: bloomWater,
    bloomTimeSec: config.defaultBloomTimeSec,
    recommendedGrind: config.recommendedGrind,
    targetBrewTimeSec: config.defaultBrewTimeSec,
    targetBrewTimeText: formatTime(config.defaultBrewTimeSec),
    waterTempC: config.waterTempC,
    waterRetentionGrams: waterRetention,
  };
}
