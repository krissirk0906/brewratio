import { describe, it, expect } from 'vitest';
import { generatePulseSchedule } from '../../src/lib/calc/pulseTimer';

describe('PulseTimer Schedule Generation (TDD)', () => {
  it('generates 3-stage pulse schedule correctly for 300g total water', () => {
    const schedule = generatePulseSchedule({
      pulseMethodId: 'three_stage',
      totalWaterGrams: 300,
      coffeeGrams: 20,
      bloomTimeSec: 45,
    });

    expect(schedule.pulseMethodId).toBe('three_stage');
    expect(schedule.steps).toHaveLength(3);

    // Step 1: Bloom (60g water = 20% or 3x coffee)
    expect(schedule.steps[0].name).toContain('Bloom');
    expect(schedule.steps[0].waterAmountGrams).toBe(60);
    expect(schedule.steps[0].cumulativeWaterGrams).toBe(60);
    expect(schedule.steps[0].startSec).toBe(0);
    expect(schedule.steps[0].durationSec).toBe(45);

    // Remaining water = 300 - 60 = 240g split into two 120g pulses
    expect(schedule.steps[1].waterAmountGrams).toBe(120);
    expect(schedule.steps[1].cumulativeWaterGrams).toBe(180);
    expect(schedule.steps[1].startSec).toBe(45);

    expect(schedule.steps[2].waterAmountGrams).toBe(120);
    expect(schedule.steps[2].cumulativeWaterGrams).toBe(300);

    // Total cumulative water matches target
    expect(schedule.totalWaterGrams).toBe(300);
  });

  it('generates 4:6 Kasuya method schedule correctly for 300g water', () => {
    const schedule = generatePulseSchedule({
      pulseMethodId: 'four_six',
      totalWaterGrams: 300,
      coffeeGrams: 20,
    });

    expect(schedule.pulseMethodId).toBe('four_six');
    expect(schedule.steps).toHaveLength(5); // 5 equal 60g pours spaced every 45s

    // First 40% (120g): 2 pours of 60g
    expect(schedule.steps[0].waterAmountGrams).toBe(60);
    expect(schedule.steps[0].cumulativeWaterGrams).toBe(60);
    expect(schedule.steps[1].waterAmountGrams).toBe(60);
    expect(schedule.steps[1].cumulativeWaterGrams).toBe(120);

    // Last 60% (180g): 3 pours of 60g
    expect(schedule.steps[2].waterAmountGrams).toBe(60);
    expect(schedule.steps[2].cumulativeWaterGrams).toBe(180);
    expect(schedule.steps[3].waterAmountGrams).toBe(60);
    expect(schedule.steps[3].cumulativeWaterGrams).toBe(240);
    expect(schedule.steps[4].waterAmountGrams).toBe(60);
    expect(schedule.steps[4].cumulativeWaterGrams).toBe(300);

    expect(schedule.totalTimeSec).toBe(225); // 5 * 45s
  });

  it('generates single pour schedule correctly', () => {
    const schedule = generatePulseSchedule({
      pulseMethodId: 'single_pour',
      totalWaterGrams: 250,
      coffeeGrams: 15,
      bloomTimeSec: 40,
    });

    expect(schedule.pulseMethodId).toBe('single_pour');
    expect(schedule.steps).toHaveLength(1);

    expect(schedule.steps[0].name).toContain('Continuous Pour');
    expect(schedule.steps[0].waterAmountGrams).toBe(250);
    expect(schedule.steps[0].cumulativeWaterGrams).toBe(250);
  });
});
