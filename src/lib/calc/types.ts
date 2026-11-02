export type BrewMethodId =
  | 'v60'
  | 'french_press'
  | 'aeropress'
  | 'chemex'
  | 'drip_machine'
  | 'cold_brew'
  | 'vietnamese_phin'
  | 'espresso'
  | 'custom';

export type BrewMode = 'by_coffee' | 'by_water' | 'by_yield';

export type BrewStrength = 'light' | 'balanced' | 'strong';

export type PulseMethodId = 'single_pour' | 'three_stage' | 'four_six';

export interface MethodConfig {
  id: BrewMethodId;
  name: string;
  defaultRatio: number; // e.g. 16 for 1:16
  ratioRange: [number, number]; // [min, max]
  strengthRatios: {
    light: number;
    balanced: number;
    strong: number;
  };
  defaultBloomRatio: number; // bloom water = coffee * defaultBloomRatio
  defaultBloomTimeSec: number;
  recommendedGrind: string;
  defaultBrewTimeSec: number;
  waterTemp: string; // e.g. "195°F - 205°F (91°C - 96°C)"
}

export interface BrewCalcInput {
  method: BrewMethodId;
  mode: BrewMode;
  amount: number; // grams or ml depending on mode
  customRatio?: number;
  strength?: BrewStrength;
}

export interface BrewCalcResult {
  methodId: BrewMethodId;
  methodName: string;
  coffeeGrams: number;
  coffeeOz: number;
  waterGrams: number;
  waterOz: number;
  ratio: number;
  ratioText: string;
  estimatedYieldMl: number;
  estimatedYieldOz: number;
  bloomWaterGrams: number;
  bloomTimeSec: number;
  recommendedGrind: string;
  targetBrewTimeSec: number;
  targetBrewTimeText: string;
  waterTemp: string;
  waterRetentionGrams: number;
}

export interface PulseStep {
  stepIndex: number;
  name: string;
  waterAmountGrams: number;
  waterAmountOz: number;
  cumulativeWaterGrams: number;
  cumulativeWaterOz: number;
  startSec: number;
  durationSec: number;
  note: string;
}

export interface PulseScheduleResult {
  pulseMethodId: PulseMethodId;
  pulseMethodName: string;
  totalTimeSec: number;
  totalWaterGrams: number;
  steps: PulseStep[];
}
