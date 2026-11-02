export interface ClientBrewState {
  method: string;
  mode: 'by_coffee' | 'by_water' | 'by_yield';
  amount: number;
  strength: 'light' | 'balanced' | 'strong';
  customRatio?: number;
  pulseMethod: 'single_pour' | 'three_stage' | 'four_six';
  unit: 'metric' | 'imperial';
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
  unit: 'metric',
};

let currentSchedule: PulseScheduleResult | null = null;
let timerInterval: number | null = null;
let timerRunning = false;
let currentElapsedSec = 0;
let currentStepIndex = 0;

function initCalculator(): void {
  const methodPills = document.querySelectorAll<HTMLButtonElement>('[data-method]');
  const modeTabs = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  const strengthPills = document.querySelectorAll<HTMLButtonElement>('[data-strength]');
  const pulseMethodPills = document.querySelectorAll<HTMLButtonElement>('[data-pulse]');
  const unitToggles = document.querySelectorAll<HTMLButtonElement>('[data-unit]');
  
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

    const isImperial = state.unit === 'imperial';

    if (outCoffee) {
      outCoffee.textContent = isImperial
        ? `${res.coffeeOz} oz (${res.coffeeGrams}g)`
        : `${res.coffeeGrams}g`;
    }

    if (outWater) {
      outWater.textContent = isImperial
        ? `${res.waterOz} fl oz (${res.waterGrams}g)`
        : `${res.waterGrams}g`;
    }

    if (outYield) {
      outYield.textContent = isImperial
        ? `~${res.estimatedYieldOz} fl oz`
        : `~${res.estimatedYieldMl} ml`;
    }

    if (outRatio) outRatio.textContent = res.ratioText;

    if (outBloom) {
      outBloom.textContent = isImperial
        ? `${(res.bloomWaterGrams * 0.035274).toFixed(1)} oz (${res.bloomWaterGrams}g) · ${res.bloomTimeSec}s`
        : `${res.bloomWaterGrams}g (${res.bloomTimeSec}s bloom)`;
    }

    if (outGrind) outGrind.textContent = res.recommendedGrind;
    if (outTemp) outTemp.textContent = res.waterTemp;
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

    const isImperial = state.unit === 'imperial';

    currentSchedule.steps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = `pulse-step-row ${idx === currentStepIndex && timerRunning ? 'active' : ''}`;
      row.id = `pulse-step-${idx}`;

      const mins = Math.floor(step.startSec / 60);
      const secs = step.startSec % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      const pourText = isImperial
        ? `+${step.waterAmountOz} oz`
        : `+${step.waterAmountGrams}g`;

      const totalText = isImperial
        ? `Total: ${step.cumulativeWaterOz} oz`
        : `Total: ${step.cumulativeWaterGrams}g`;

      row.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div style="font-weight:700; font-size:0.95rem; color:var(--color-espresso);">
            ${step.stepIndex}. ${step.name}
          </div>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">
            ${step.note}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; font-family:var(--font-mono); color:var(--color-crema); font-size:1.05rem;">
            ${pourText} <span style="font-size:0.8rem; color:var(--color-text-muted); font-weight:normal;">(${totalText})</span>
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--color-text-subtle);">
            Target @ ${timeStr}
          </div>
        </div>
      `;
      pulseStepsContainer.appendChild(row);
    });
  }

  function updateInputControls(): void {
    if (state.mode === 'by_coffee') {
      if (amountLabel) amountLabel.textContent = 'Ground Coffee Dose:';
      if (amountUnit) amountUnit.textContent = state.unit === 'imperial' ? 'oz' : 'g';
      if (amountSlider) {
        amountSlider.min = state.unit === 'imperial' ? '0.3' : '8';
        amountSlider.max = state.unit === 'imperial' ? '2.5' : '60';
        amountSlider.step = state.unit === 'imperial' ? '0.1' : '1';
        amountSlider.value = String(state.amount);
      }
    } else if (state.mode === 'by_water') {
      if (amountLabel) amountLabel.textContent = 'Total Water to Pour:';
      if (amountUnit) amountUnit.textContent = state.unit === 'imperial' ? 'fl oz' : 'g';
      if (amountSlider) {
        amountSlider.min = state.unit === 'imperial' ? '4' : '100';
        amountSlider.max = state.unit === 'imperial' ? '36' : '1000';
        amountSlider.step = state.unit === 'imperial' ? '1' : '10';
        amountSlider.value = String(state.amount);
      }
    } else {
      if (amountLabel) amountLabel.textContent = 'Target Beverage Yield:';
      if (amountUnit) amountUnit.textContent = state.unit === 'imperial' ? 'fl oz' : 'ml';
      if (amountSlider) {
        amountSlider.min = state.unit === 'imperial' ? '4' : '80';
        amountSlider.max = state.unit === 'imperial' ? '32' : '800';
        amountSlider.step = state.unit === 'imperial' ? '1' : '10';
        amountSlider.value = String(state.amount);
      }
    }
    if (amountInput) amountInput.value = String(state.amount);
  }

  // Method Selection
  methodPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      methodPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.method = btn.dataset.method || 'v60';
      renderOutputs();
    });
  });

  // Mode Selection
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

  // Strength Selection
  strengthPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      strengthPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.strength = (btn.dataset.strength as any) || 'balanced';
      renderOutputs();
    });
  });

  // Pulse Strategy Selection
  pulseMethodPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      pulseMethodPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.pulseMethod = (btn.dataset.pulse as any) || 'three_stage';
      resetTimer();
      renderOutputs();
    });
  });

  // Unit Selector (Metric vs Imperial)
  unitToggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      unitToggles.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.unit = (btn.dataset.unit as any) || 'metric';
      updateInputControls();
      renderOutputs();
    });
  });

  // Sync Slider and Number Input
  if (amountInput && amountSlider) {
    amountInput.addEventListener('input', () => {
      const val = parseFloat(amountInput.value);
      if (!Number.isNaN(val)) {
        state.amount = val;
        amountSlider.value = String(val);
        renderOutputs();
      }
    });

    amountSlider.addEventListener('input', () => {
      const val = parseFloat(amountSlider.value);
      state.amount = val;
      amountInput.value = String(val);
      renderOutputs();
    });
  }

  // Timer Logic
  function updateTimerUI(): void {
    if (!timerDigits || !timerStepName || !currentSchedule) return;

    const mins = Math.floor(currentElapsedSec / 60);
    const secs = currentElapsedSec % 60;
    timerDigits.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Find current active step
    let activeIdx = 0;
    for (let i = 0; i < currentSchedule.steps.length; i++) {
      if (currentElapsedSec >= currentSchedule.steps[i].startSec) {
        activeIdx = i;
      }
    }

    if (activeIdx !== currentStepIndex && timerRunning) {
      currentStepIndex = activeIdx;
      playChime(880, 0.25); // Chime on new step
    }

    const currentStep = currentSchedule.steps[currentStepIndex];
    if (currentStep) {
      timerStepName.textContent = `Step ${currentStep.stepIndex}/${currentSchedule.steps.length}: ${currentStep.name}`;
    }

    // Progress bar
    if (timerBar && currentSchedule.totalTimeSec > 0) {
      const progress = Math.min(100, (currentElapsedSec / currentSchedule.totalTimeSec) * 100);
      timerBar.style.width = `${progress}%`;
    }

    // Highlight row
    document.querySelectorAll('.pulse-step-row').forEach((el, idx) => {
      if (idx === currentStepIndex && timerRunning) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Finished?
    if (currentElapsedSec >= currentSchedule.totalTimeSec) {
      pauseTimer();
      timerStepName.textContent = '🎉 Brew Complete! Enjoy your cup.';
      playCompletionChime();
    }
  }

  function startTimer(): void {
    if (timerRunning) return;
    timerRunning = true;
    if (btnStart) {
      btnStart.textContent = '⏸ Pause';
      btnStart.classList.add('active');
    }

    // Resume Audio Context on user gesture
    playChime(660, 0.1);

    timerInterval = window.setInterval(() => {
      currentElapsedSec += 1;
      updateTimerUI();
    }, 1000);
    updateTimerUI();
  }

  function pauseTimer(): void {
    timerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (btnStart) {
      btnStart.textContent = '▶ Resume';
      btnStart.classList.remove('active');
    }
  }

  function resetTimer(): void {
    pauseTimer();
    currentElapsedSec = 0;
    currentStepIndex = 0;
    if (btnStart) btnStart.textContent = '▶ Start Timer';
    if (timerDigits) timerDigits.textContent = '00:00';
    if (timerStepName) timerStepName.textContent = 'Ready to brew';
    if (timerBar) timerBar.style.width = '0%';
    document.querySelectorAll('.pulse-step-row').forEach((el) => el.classList.remove('active'));
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (timerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', resetTimer);
  }

  // Initial render
  updateInputControls();
  renderOutputs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}
