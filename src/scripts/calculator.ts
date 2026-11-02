export interface ClientBrewState {
  method: string;
  mode: 'by_coffee' | 'by_water' | 'by_yield';
  amount: number;
  strength: 'light' | 'balanced' | 'strong';
  customRatio?: number;
  pulseMethod: 'single_pour' | 'three_stage' | 'four_six';
}

import { calculateBrew } from '../lib/calc/brewRatio';
import { generatePulseSchedule } from '../lib/calc/pulseTimer';
import { playChime, playCompletionChime } from '../lib/audio/chime';
import type { BrewMethodId, PulseScheduleResult } from '../lib/calc/types';

// State
let state: ClientBrewState = {
  method: 'v60',
  mode: 'by_coffee',
  amount: 15,
  strength: 'balanced',
  pulseMethod: 'three_stage',
};

let currentSchedule: PulseScheduleResult | null = null;
let timerInterval: number | null = null;
let timerRunning = false;
let currentElapsedSec = 0;
let currentStepIndex = 0;

// DOM Elements
function initCalculator(): void {
  const methodPills = document.querySelectorAll<HTMLButtonElement>('[data-method]');
  const modeTabs = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  const strengthPills = document.querySelectorAll<HTMLButtonElement>('[data-strength]');
  const pulseMethodPills = document.querySelectorAll<HTMLButtonElement>('[data-pulse]');
  
  const amountInput = document.getElementById('amount-input') as HTMLInputElement | null;
  const amountSlider = document.getElementById('amount-slider') as HTMLInputElement | null;
  const amountUnit = document.getElementById('amount-unit');
  const amountLabel = document.getElementById('amount-label');

  // Outputs
  const outCoffee = document.getElementById('out-coffee');
  const outWater = document.getElementById('out-water');
  const outYield = document.getElementById('out-yield');
  const outRatio = document.getElementById('out-ratio');
  const outBloom = document.getElementById('out-bloom');
  const outGrind = document.getElementById('out-grind');
  const outTemp = document.getElementById('out-temp');
  const outBrewTime = document.getElementById('out-brew-time');

  // Timer DOM
  const timerDigits = document.getElementById('timer-digits');
  const timerStepName = document.getElementById('timer-step-name');
  const timerBar = document.getElementById('timer-bar-fill');
  const btnStart = document.getElementById('btn-timer-start') as HTMLButtonElement | null;
  const btnReset = document.getElementById('btn-timer-reset') as HTMLButtonElement | null;
  const pulseStepsContainer = document.getElementById('pulse-steps-list');

  function renderOutputs(): void {
    const res = calculateBrew({
      method: state.method as BrewMethodId,
      mode: state.mode,
      amount: state.amount,
      strength: state.strength,
      customRatio: state.customRatio,
    });

    if (outCoffee) outCoffee.textContent = `${res.coffeeGrams}g`;
    if (outWater) outWater.textContent = `${res.waterGrams}g`;
    if (outYield) outYield.textContent = `~${res.estimatedYieldMl}ml`;
    if (outRatio) outRatio.textContent = res.ratioText;
    if (outBloom) outBloom.textContent = `${res.bloomWaterGrams}g (ủ ${res.bloomTimeSec}s)`;
    if (outGrind) outGrind.textContent = res.recommendedGrind;
    if (outTemp) outTemp.textContent = res.waterTempC;
    if (outBrewTime) outBrewTime.textContent = res.targetBrewTimeText;

    // Generate pulse schedule
    currentSchedule = generatePulseSchedule({
      pulseMethodId: state.pulseMethod,
      totalWaterGrams: res.waterGrams,
      coffeeGrams: res.coffeeGrams,
      bloomTimeSec: res.bloomTimeSec,
    });

    renderPulseSteps();
  }

  function renderPulseSteps(): void {
    if (!pulseStepsContainer || !currentSchedule) return;
    pulseStepsContainer.innerHTML = '';

    currentSchedule.steps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = `pulse-step-row ${idx === currentStepIndex && timerRunning ? 'active' : ''}`;
      row.id = `pulse-step-${idx}`;

      const mins = Math.floor(step.startSec / 60);
      const secs = step.startSec % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      row.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div style="font-weight:700; font-size:0.95rem; color:var(--color-espresso);">
            ${step.stepIndex}. ${step.name}
          </div>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">
            ${step.note}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; font-family:var(--font-mono); color:var(--color-crema); font-size:1.05rem;">
            +${step.waterAmountGrams}g <span style="font-size:0.8rem; color:var(--color-text-muted); font-weight:normal;">(Tổng ${step.cumulativeWaterGrams}g)</span>
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--color-text-subtle);">
            Mốc ${timeStr}
          </div>
        </div>
      `;
      pulseStepsContainer.appendChild(row);
    });
  }

  function updateInputControls(): void {
    if (state.mode === 'by_coffee') {
      if (amountLabel) amountLabel.textContent = 'Khối lượng cà phê hạt / bột:';
      if (amountUnit) amountUnit.textContent = 'g';
      if (amountSlider) {
        amountSlider.min = '8';
        amountSlider.max = '60';
        amountSlider.step = '1';
        amountSlider.value = String(state.amount);
      }
    } else if (state.mode === 'by_water') {
      if (amountLabel) amountLabel.textContent = 'Tổng lượng nước muốn pha:';
      if (amountUnit) amountUnit.textContent = 'ml/g';
      if (amountSlider) {
        amountSlider.min = '100';
        amountSlider.max = '1000';
        amountSlider.step = '10';
        amountSlider.value = String(state.amount);
      }
    } else {
      if (amountLabel) amountLabel.textContent = 'Lượng cà phê thành phẩm thu được:';
      if (amountUnit) amountUnit.textContent = 'ml';
      if (amountSlider) {
        amountSlider.min = '80';
        amountSlider.max = '800';
        amountSlider.step = '10';
        amountSlider.value = String(state.amount);
      }
    }
    if (amountInput) amountInput.value = String(state.amount);
  }

  // Event Listeners for Method Pills
  methodPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      methodPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.method = btn.dataset.method || 'v60';
      renderOutputs();
    });
  });

  // Event Listeners for Mode Tabs
  modeTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeTabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = (btn.dataset.mode as any) || 'by_coffee';
      if (state.mode === 'by_coffee') state.amount = 15;
      else if (state.mode === 'by_water') state.amount = 240;
      else state.amount = 200;
      updateInputControls();
      renderOutputs();
    });
  });

  // Strength Pills
  strengthPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      strengthPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.strength = (btn.dataset.strength as any) || 'balanced';
      renderOutputs();
    });
  });

  // Pulse Method Pills
  pulseMethodPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      pulseMethodPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.pulseMethod = (btn.dataset.pulse as any) || 'three_stage';
      resetTimer();
      renderOutputs();
    });
  });

  // Input bindings
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      const val = parseFloat(amountInput.value);
      if (!Number.isNaN(val) && val > 0) {
        state.amount = val;
        if (amountSlider) amountSlider.value = String(val);
        renderOutputs();
      }
    });
  }

  if (amountSlider) {
    amountSlider.addEventListener('input', () => {
      const val = parseFloat(amountSlider.value);
      state.amount = val;
      if (amountInput) amountInput.value = String(val);
      renderOutputs();
    });
  }

  // ==========================================================================
  // Timer Logic & Web Audio API
  // ==========================================================================
  function formatSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function startTimer(): void {
    if (timerRunning) return;
    timerRunning = true;
    if (btnStart) btnStart.textContent = 'Tạm dừng ⏸';
    playChime(880, 0.8); // Initial start chime

    timerInterval = window.setInterval(() => {
      currentElapsedSec++;
      if (timerDigits) timerDigits.textContent = formatSeconds(currentElapsedSec);

      // Check current step
      if (currentSchedule && currentSchedule.steps.length > 0) {
        const total = currentSchedule.totalTimeSec;
        const progress = Math.min(100, (currentElapsedSec / total) * 100);
        if (timerBar) timerBar.style.width = `${progress}%`;

        // Check if step changed
        const activeIdx = currentSchedule.steps.findIndex((step, i) => {
          const nextStep = currentSchedule!.steps[i + 1];
          return currentElapsedSec >= step.startSec && (!nextStep || currentElapsedSec < nextStep.startSec);
        });

        if (activeIdx !== -1 && activeIdx !== currentStepIndex) {
          currentStepIndex = activeIdx;
          playChime(1046, 1.0); // Step change chime
          renderPulseSteps();
        }

        if (currentSchedule.steps[currentStepIndex] && timerStepName) {
          timerStepName.textContent = currentSchedule.steps[currentStepIndex].name;
        }

        // Completion check
        if (currentElapsedSec >= total) {
          pauseTimer();
          playCompletionChime();
          if (timerStepName) timerStepName.textContent = '🎉 Chiết xuất hoàn tất!';
        }
      }
    }, 1000);
  }

  function pauseTimer(): void {
    if (!timerRunning) return;
    timerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    if (btnStart) btnStart.textContent = 'Tiếp tục ▶';
  }

  function resetTimer(): void {
    pauseTimer();
    currentElapsedSec = 0;
    currentStepIndex = 0;
    if (timerDigits) timerDigits.textContent = '00:00';
    if (timerBar) timerBar.style.width = '0%';
    if (btnStart) btnStart.textContent = 'Bắt đầu rót ▶';
    if (timerStepName && currentSchedule && currentSchedule.steps[0]) {
      timerStepName.textContent = `Sẵn sàng: ${currentSchedule.steps[0].name}`;
    }
    renderPulseSteps();
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (timerRunning) pauseTimer();
      else startTimer();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', resetTimer);
  }

  // Initial render
  updateInputControls();
  renderOutputs();
  resetTimer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}
