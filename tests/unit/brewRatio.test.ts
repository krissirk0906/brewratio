import { describe, it, expect } from 'vitest';
import { calculateBrew, getMethodConfig } from '../../src/lib/calc/brewRatio';

describe('BrewRatio Core Calculation (TDD)', () => {
  it('has configurations for all major brewing methods', () => {
    const methods = ['v60', 'french_press', 'aeropress', 'chemex', 'cold_brew', 'vietnamese_phin', 'espresso'];
    for (const m of methods) {
      const config = getMethodConfig(m as any);
      expect(config).toBeDefined();
      expect(config.defaultRatio).toBeGreaterThan(0);
      expect(config.ratioRange[0]).toBeLessThan(config.ratioRange[1]);
    }
  });

  describe('Mode: by_coffee (Khối lượng cà phê bột)', () => {
    it('calculates water and yield accurately for V60 standard (15g @ 1:16)', () => {
      const result = calculateBrew({
        method: 'v60',
        mode: 'by_coffee',
        amount: 15,
      });

      expect(result.coffeeGrams).toBe(15);
      expect(result.waterGrams).toBe(240); // 15 * 16 = 240g
      expect(result.ratio).toBe(16);
      expect(result.ratioText).toBe('1:16');
      // Grounds retention: 15g * 2.1g/g = 31.5g
      expect(result.waterRetentionGrams).toBe(31.5);
      // Yield: 240 - 31.5 = 208.5ml
      expect(result.estimatedYieldMl).toBe(208.5);
      // Bloom: 15g * 3 = 45g
      expect(result.bloomWaterGrams).toBe(45);
      expect(result.bloomTimeSec).toBe(45);
      expect(result.targetBrewTimeSec).toBe(210); // 3:30
    });

    it('respects strength presets for French Press', () => {
      const balanced = calculateBrew({ method: 'french_press', mode: 'by_coffee', amount: 20, strength: 'balanced' });
      const strong = calculateBrew({ method: 'french_press', mode: 'by_coffee', amount: 20, strength: 'strong' });
      const light = calculateBrew({ method: 'french_press', mode: 'by_coffee', amount: 20, strength: 'light' });

      // Stronger brew uses less water per gram of coffee (lower ratio)
      expect(strong.waterGrams).toBeLessThan(balanced.waterGrams);
      expect(light.waterGrams).toBeGreaterThan(balanced.waterGrams);
    });

    it('supports custom ratio', () => {
      const custom = calculateBrew({
        method: 'v60',
        mode: 'by_coffee',
        amount: 20,
        customRatio: 17.5,
      });

      expect(custom.waterGrams).toBe(350); // 20 * 17.5
      expect(custom.ratioText).toBe('1:17.5');
    });
  });

  describe('Mode: by_water (Tổng lượng nước)', () => {
    it('calculates required coffee grams for 320g water on V60 1:16', () => {
      const result = calculateBrew({
        method: 'v60',
        mode: 'by_water',
        amount: 320,
      });

      // 320 / 16 = 20g
      expect(result.coffeeGrams).toBe(20);
      expect(result.waterGrams).toBe(320);
      expect(result.estimatedYieldMl).toBe(278); // 320 - (20 * 2.1)
    });
  });

  describe('Mode: by_yield (Lượng cà phê thành phẩm mong muốn)', () => {
    it('calculates dry coffee and brew water needed to produce 250ml beverage', () => {
      const result = calculateBrew({
        method: 'v60',
        mode: 'by_yield',
        amount: 250,
      });

      // Yield = Water - Coffee * 2.1 = Coffee * Ratio - Coffee * 2.1 = Coffee * (Ratio - 2.1)
      // Coffee = 250 / (16 - 2.1) = 250 / 13.9 ≈ 17.985g -> rounded to 18.0g
      expect(result.coffeeGrams).toBeCloseTo(18.0, 1);
      expect(result.waterGrams).toBeCloseTo(result.coffeeGrams * 16, 0);
      expect(result.estimatedYieldMl).toBeCloseTo(250, 0);
    });
  });

  describe('Edge Cases & Safeguards', () => {
    it('handles zero or negative amounts gracefully by clamping', () => {
      const zeroResult = calculateBrew({ method: 'v60', mode: 'by_coffee', amount: 0 });
      expect(zeroResult.coffeeGrams).toBe(0);
      expect(zeroResult.waterGrams).toBe(0);
      expect(zeroResult.estimatedYieldMl).toBe(0);

      const negResult = calculateBrew({ method: 'v60', mode: 'by_coffee', amount: -10 });
      expect(negResult.coffeeGrams).toBe(0);
      expect(negResult.waterGrams).toBe(0);
    });

    it('clamps unreasonable ratios to safe range', () => {
      const tooLow = calculateBrew({ method: 'v60', mode: 'by_coffee', amount: 15, customRatio: 2 });
      expect(tooLow.ratio).toBeGreaterThanOrEqual(10);

      const tooHigh = calculateBrew({ method: 'v60', mode: 'by_coffee', amount: 15, customRatio: 50 });
      expect(tooHigh.ratio).toBeLessThanOrEqual(25);
    });
  });
});
