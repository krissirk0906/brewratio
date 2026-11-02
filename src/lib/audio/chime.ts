/**
 * Web Audio API Chime Synthesizer
 * Generates pleasant, warm coffee-timer chimes without external audio assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a clean, resonant bell chime (e.g. 880Hz A5 or 1046Hz C6) with smooth exponential decay.
 */
export function playChime(freq = 880, duration = 1.2): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Envelope: quick attack (5ms), exponential decay
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio playback not allowed or failed:', err);
  }
}

/**
 * Plays a celebratory double chime for brew completion.
 */
export function playCompletionChime(): void {
  playChime(784, 0.8); // G5
  setTimeout(() => {
    playChime(1046, 1.4); // C6
  }, 220);
}
