import * as Tone from 'tone';

let audioStarted = false;

async function ensureAudio() {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
}

/**
 * Unlock the iOS Web Audio API by starting the audio context and playing
 * a silent buffer. Call this once on the first user interaction.
 */
export async function initializeAudio() {
  if (audioStarted) return;
  try {
    await Tone.start();
    const ctx = Tone.getContext().rawContext as AudioContext;
    // Play a silent 0.1s buffer to fully unlock iOS audio
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioStarted = true;
  } catch (err) {
    console.warn('[sfx] initializeAudio failed', err);
  }
}

const clickSynth = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.1 },
  volume: -12,
}).toDestination();

const selectSynth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 },
  volume: -8,
}).toDestination();

const chordSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.2 },
  volume: -6,
}).toDestination();

const suspenseSynth = new Tone.FMSynth({
  harmonicity: 3,
  modulationIndex: 10,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.5 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.3, decay: 0.2, sustain: 0.5, release: 0.8 },
  volume: -14,
}).toDestination();

const revealFilter = new Tone.Filter(2000, 'lowpass').toDestination();
const revealSynth = new Tone.Synth({
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
  volume: -10,
}).connect(revealFilter);

export const SFX = {
  /** Quick click for tile hover/tap */
  click: async () => {
    await ensureAudio();
    clickSynth.triggerAttackRelease('C5', '32n');
  },

  /** Tile selected in Fast Assign mode */
  select: async () => {
    await ensureAudio();
    selectSynth.triggerAttackRelease('E5', '16n');
  },

  /** Tile deselected */
  deselect: async () => {
    await ensureAudio();
    selectSynth.triggerAttackRelease('A4', '16n');
  },

  /** Assignment confirmed */
  confirm: async () => {
    await ensureAudio();
    chordSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'B4'], '4n');
  },

  /** Prize revealed — triumphant chord */
  prizeReveal: async () => {
    await ensureAudio();
    const now = Tone.now();
    chordSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '2n', now);
    chordSynth.triggerAttackRelease(['C5', 'E5', 'G5', 'B5'], '2n', now + 0.15);
  },

  /** Lotto wheel spinning — suspenseful rising tone */
  lottoSpin: async () => {
    await ensureAudio();
    const now = Tone.now();
    suspenseSynth.triggerAttackRelease('C3', '3n', now);
    suspenseSynth.triggerAttackRelease('D3', '8n', now + 0.3);
    suspenseSynth.triggerAttackRelease('E3', '8n', now + 0.6);
    suspenseSynth.triggerAttackRelease('F#3', '8n', now + 0.9);
    suspenseSynth.triggerAttackRelease('G#3', '4n', now + 1.2);
  },

  /** Lotto wheel tick — each number passing */
  lottoTick: async (pitch = 'C5') => {
    await ensureAudio();
    clickSynth.triggerAttackRelease(pitch, '64n');
  },

  /** Lotto landing — dramatic reveal sting */
  lottoLand: async () => {
    await ensureAudio();
    const now = Tone.now();
    revealSynth.triggerAttackRelease('G4', '8n', now);
    revealSynth.triggerAttackRelease('B4', '8n', now + 0.1);
    revealSynth.triggerAttackRelease('D5', '4n', now + 0.2);
    chordSynth.triggerAttackRelease(['G3', 'B3', 'D4', 'F#4'], '2n', now + 0.35);
  },

  /** Error / wrong answer buzz */
  error: async () => {
    await ensureAudio();
    const now = Tone.now();
    clickSynth.triggerAttackRelease('E2', '16n', now);
    clickSynth.triggerAttackRelease('Eb2', '16n', now + 0.1);
  },

  /** AI game mode transition */
  mystical: async () => {
    await ensureAudio();
    const now = Tone.now();
    chordSynth.triggerAttackRelease(['D4', 'F#4', 'A4'], '2n', now);
    chordSynth.triggerAttackRelease(['E4', 'G#4', 'B4'], '2n', now + 0.4);
  },

  /** Lightning strike on wrong answer */
  lightning: async () => {
    await ensureAudio();
    const now = Tone.now();
    // Thunder crack
    suspenseSynth.triggerAttackRelease('C2', '16n', now);
    clickSynth.triggerAttackRelease('G1', '32n', now + 0.05);
    suspenseSynth.triggerAttackRelease('D2', '16n', now + 0.15);
  },

  /** Spiteful Reagan cackle - descending evil tones */
  spitefulLaugh: async () => {
    await ensureAudio();
    const now = Tone.now();
    selectSynth.triggerAttackRelease('E5', '16n', now);
    selectSynth.triggerAttackRelease('C5', '16n', now + 0.12);
    selectSynth.triggerAttackRelease('A4', '16n', now + 0.24);
    selectSynth.triggerAttackRelease('E4', '8n', now + 0.36);
    chordSynth.triggerAttackRelease(['A3', 'C4', 'E4'], '4n', now + 0.5);
  },

  /** Reluctant grumble when giving spins */
  reluctantGive: async () => {
    await ensureAudio();
    const now = Tone.now();
    suspenseSynth.triggerAttackRelease('E3', '8n', now);
    suspenseSynth.triggerAttackRelease('Eb3', '8n', now + 0.2);
    suspenseSynth.triggerAttackRelease('D3', '4n', now + 0.4);
  },

  /** Crystal ball hum */
  crystalHum: async () => {
    await ensureAudio();
    const now = Tone.now();
    chordSynth.triggerAttackRelease(['A3', 'E4'], '1n', now);
  },
};
