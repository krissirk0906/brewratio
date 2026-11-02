import type { PulseMethodId, PulseScheduleResult, PulseStep } from './types';

export interface PulseScheduleInput {
  pulseMethodId: PulseMethodId;
  totalWaterGrams: number;
  coffeeGrams: number;
  bloomTimeSec?: number;
}

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
      name: 'Ủ cà phê (Bloom)',
      waterAmountGrams: bloomWater,
      cumulativeWaterGrams: bloomWater,
      startSec: 0,
      durationSec: bloomTime,
      note: 'Rót đều từ tâm xoắn ốc ra ngoài để làm ướt đều bột cà phê và thoát khí CO2.',
    });

    const pulse1Start = bloomTime;
    const pulse1Duration = 45;
    steps.push({
      stepIndex: 2,
      name: 'Rót lần 1 (Pulse 1)',
      waterAmountGrams: pulse1Water,
      cumulativeWaterGrams: Math.round((bloomWater + pulse1Water) * 10) / 10,
      startSec: pulse1Start,
      durationSec: pulse1Duration,
      note: 'Rót dòng nước đều, ổn định để trích xuất tầng hương hoa quả và vị ngọt.',
    });

    const pulse2Start = pulse1Start + pulse1Duration;
    const pulse2Duration = 45;
    steps.push({
      stepIndex: 3,
      name: 'Rót lần 2 (Pulse 2 - Về đích)',
      waterAmountGrams: pulse2Water,
      cumulativeWaterGrams: totalWaterGrams,
      startSec: pulse2Start,
      durationSec: pulse2Duration,
      note: 'Rót nhẹ nhàng duy trì mực nước ổn định, chờ nước rút hoàn toàn.',
    });

    return {
      pulseMethodId: 'three_stage',
      pulseMethodName: 'Rót 3 Giai Đoạn (Chuẩn SCA)',
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
        stageName = 'Lần 1 (Ủ - 40% Cân bằng chua/ngọt)';
        note = 'Tetsu Kasuya 4:6: Quyết định độ cân bằng giữa vị chua thanh và độ ngọt.';
      } else if (i === 1) {
        stageName = 'Lần 2 (40% Hoàn thành giai đoạn 1)';
        note = 'Rót dòng tròn đều đặn, chờ nước rút gần hết trước khi rót tiếp.';
      } else if (i === 2) {
        stageName = 'Lần 3 (60% Điều chỉnh độ đậm Body)';
        note = 'Bắt đầu giai đoạn 60% điều chỉnh độ đậm và hậu vị cà phê.';
      } else if (i === 3) {
        stageName = 'Lần 4 (60% Tiếp tục)';
        note = 'Duy trì chiết xuất sâu không để khô bã cà phê.';
      } else {
        stageName = 'Lần 5 (Về đích đủ nước)';
        note = 'Rót mốc nước cuối cùng và chờ chiết xuất hoàn tất.';
      }

      steps.push({
        stepIndex: i + 1,
        name: stageName,
        waterAmountGrams: amount,
        cumulativeWaterGrams: cumulative,
        startSec: i * stepDuration,
        durationSec: stepDuration,
        note,
      });
    }

    return {
      pulseMethodId: 'four_six',
      pulseMethodName: 'Phương pháp 4:6 (Tetsu Kasuya)',
      totalTimeSec: 5 * stepDuration,
      totalWaterGrams,
      steps,
    };
  }

  // Default: single_pour
  const bloomWater = Math.min(totalWaterGrams, Math.round(coffeeGrams * 3 * 10) / 10);
  const mainPourWater = Math.max(0, Math.round((totalWaterGrams - bloomWater) * 10) / 10);
  const mainStart = bloomTime;
  const mainDuration = 90;

  steps.push({
    stepIndex: 1,
    name: 'Ủ cà phê (Bloom)',
    waterAmountGrams: bloomWater,
    cumulativeWaterGrams: bloomWater,
    startSec: 0,
    durationSec: bloomTime,
    note: 'Làm ướt đều toàn bộ bề mặt cà phê, chờ khí CO2 thoát ra hết.',
  });

  steps.push({
    stepIndex: 2,
    name: 'Rót chính (Main Pour)',
    waterAmountGrams: mainPourWater,
    cumulativeWaterGrams: totalWaterGrams,
    startSec: mainStart,
    durationSec: mainDuration,
    note: 'Rót vòng tròn đồng tâm liên tục cho đến khi đạt tổng lượng nước mục tiêu.',
  });

  return {
    pulseMethodId: 'single_pour',
    pulseMethodName: 'Rót một lần (Continuous Pour)',
    totalTimeSec: mainStart + mainDuration,
    totalWaterGrams,
    steps,
  };
}
