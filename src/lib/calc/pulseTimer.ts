import type { PulseMethodId, PulseScheduleResult, PulseStep } from './types';

export interface PulseScheduleInput {
  pulseMethodId: PulseMethodId;
  totalWaterGrams: number;
  coffeeGrams: number;
  bloomTimeSec?: number;
}

const GRAMS_TO_OZ = 0.035274;

export function generatePulseSchedule(input: PulseScheduleInput): PulseScheduleResult {
  const { pulseMethodId, totalWaterGrams, coffeeGrams } = input;
  const bloomTime = input.bloomTimeSec ?? 45;

  const steps: PulseStep[] = [];

  if (pulseMethodId === 'three_stage') {
    // Stage 1: Bloom (60g or 3x coffee or 20% water)
    const bloomWater = Math.min(
      totalWaterGrams,
      Math.max(coffeeGrams * 3, Math.round(totalWaterGrams * 0.2))
    );
    const remainingWater = Math.max(0, totalWaterGrams - bloomWater);
    const pulse1Water = Math.round((remainingWater / 2) * 10) / 10;
    const pulse2Water = Math.round((remainingWater - pulse1Water) * 10) / 10;

    steps.push({
      stepIndex: 1,
      name: 'Bloom (Pre-wetting)',
      waterAmountGrams: bloomWater,
      waterAmountOz: Math.round(bloomWater * GRAMS_TO_OZ * 10) / 10,
      cumulativeWaterGrams: bloomWater,
      cumulativeWaterOz: Math.round(bloomWater * GRAMS_TO_OZ * 10) / 10,
      startSec: 0,
      durationSec: bloomTime,
      note: 'Pour gently outward from the center in spirals. Saturate all grounds to degas trapped CO2.',
    });

    const pulse1Start = bloomTime;
    const pulse1Duration = 45;
    const cum1 = Math.round((bloomWater + pulse1Water) * 10) / 10;
    steps.push({
      stepIndex: 2,
      name: 'First Pour (Acidity & Sweetness)',
      waterAmountGrams: pulse1Water,
      waterAmountOz: Math.round(pulse1Water * GRAMS_TO_OZ * 10) / 10,
      cumulativeWaterGrams: cum1,
      cumulativeWaterOz: Math.round(cum1 * GRAMS_TO_OZ * 10) / 10,
      startSec: pulse1Start,
      durationSec: pulse1Duration,
      note: 'Steady circular pour maintaining a calm brew slurry and optimal extraction temperature.',
    });

    const pulse2Start = pulse1Start + pulse1Duration;
    const pulse2Duration = 45;
    steps.push({
      stepIndex: 3,
      name: 'Final Pour (Balance & Finish)',
      waterAmountGrams: pulse2Water,
      waterAmountOz: Math.round(pulse2Water * GRAMS_TO_OZ * 10) / 10,
      cumulativeWaterGrams: totalWaterGrams,
      cumulativeWaterOz: Math.round(totalWaterGrams * GRAMS_TO_OZ * 10) / 10,
      startSec: pulse2Start,
      durationSec: pulse2Duration,
      note: 'Pour gently up to target water level. Allow full drawdown for a clean, balanced cup.',
    });

    return {
      pulseMethodId: 'three_stage',
      pulseMethodName: 'SCA 3-Stage Pour (Recommended)',
      totalTimeSec: pulse2Start + pulse2Duration,
      totalWaterGrams,
      steps,
    };
  }

  if (pulseMethodId === 'four_six') {
    // Tetsu Kasuya 4:6 Method: 5 equal pours spaced every 45s
    const pourAmount = Math.round((totalWaterGrams / 5) * 10) / 10;
    let cumulative = 0;
    const stepDuration = 45;

    for (let i = 0; i < 5; i++) {
      const isLast = i === 4;
      const amount = isLast ? Math.round((totalWaterGrams - cumulative) * 10) / 10 : pourAmount;
      cumulative = Math.round((cumulative + amount) * 10) / 10;

      let stageName = '';
      let note = '';
      if (i === 0) {
        stageName = 'Pour 1 (Bloom — Acidity/Sweetness)';
        note = 'First 40%: Determines the balance between bright acidity and sweetness.';
      } else if (i === 1) {
        stageName = 'Pour 2 (Finish First 40%)';
        note = 'Pour concentric circles and let bed draw down before next pour.';
      } else if (i === 2) {
        stageName = 'Pour 3 (Start 60% — Strength & Body)';
        note = 'Remaining 60%: Regulates body thickness and extraction strength.';
      } else if (i === 3) {
        stageName = 'Pour 4 (Continue 60% Extraction)';
        note = 'Keep water temperature consistent; do not let bed run dry.';
      } else {
        stageName = 'Pour 5 (Final Target Pour)';
        note = 'Complete target water volume and allow full drawdown.';
      }

      steps.push({
        stepIndex: i + 1,
        name: stageName,
        waterAmountGrams: amount,
        waterAmountOz: Math.round(amount * GRAMS_TO_OZ * 10) / 10,
        cumulativeWaterGrams: cumulative,
        cumulativeWaterOz: Math.round(cumulative * GRAMS_TO_OZ * 10) / 10,
        startSec: i * stepDuration,
        durationSec: stepDuration,
        note,
      });
    }

    return {
      pulseMethodId: 'four_six',
      pulseMethodName: 'Tetsu Kasuya 4:6 Method',
      totalTimeSec: 5 * stepDuration,
      totalWaterGrams,
      steps,
    };
  }

  // Fallback: Single Pour
  steps.push({
    stepIndex: 1,
    name: 'Continuous Pour (Single Stream)',
    waterAmountGrams: totalWaterGrams,
    waterAmountOz: Math.round(totalWaterGrams * GRAMS_TO_OZ * 10) / 10,
    cumulativeWaterGrams: totalWaterGrams,
    cumulativeWaterOz: Math.round(totalWaterGrams * GRAMS_TO_OZ * 10) / 10,
    startSec: 0,
    durationSec: 180,
    note: 'Steady continuous pour across coffee bed until target weight is reached.',
  });

  return {
    pulseMethodId: 'single_pour',
    pulseMethodName: 'Single Continuous Pour',
    totalTimeSec: 180,
    totalWaterGrams,
    steps,
  };
}
