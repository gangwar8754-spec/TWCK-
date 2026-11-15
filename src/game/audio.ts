import { EngineSoundProfile, SurfaceType } from './types';

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private volume = 0.65;
  private initialized = false;

  unlock() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;
      this.engineFilter.Q.value = 2.2;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 48;

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.value = 96;

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();

      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.value = 900;
      this.noiseFilter.Q.value = 1.4;

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = 0;

      noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);
      noiseSource.start();

      this.initialized = true;
    } catch {
      // Audio unavailable
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  updateVehicleAudio(
    active: boolean,
    engineRunning: boolean,
    profile: EngineSoundProfile,
    rpmNorm: number,
    throttle: number,
    speedKmh: number,
    skidIntensity: number,
    surface: SurfaceType,
  ) {
    if (!this.initialized || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain || !this.noiseGain || !this.noiseFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.noiseGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    if (!engineRunning) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
    } else {
      let baseIdle = 42;
      let rpmSpan = 92;
      let filterBase = 210;
      if (profile === 'sedan') {
        baseIdle = 52;
        rpmSpan = 128;
        filterBase = 300;
      } else if (profile === 'heavy_diesel') {
        baseIdle = 31;
        rpmSpan = 58;
        filterBase = 155;
      } else if (profile === 'moto') {
        baseIdle = 68;
        rpmSpan = 165;
        filterBase = 380;
      }

      const baseFreq = baseIdle + rpmNorm * rpmSpan + throttle * 16;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * (profile === 'heavy_diesel' ? 1.5 : 1.98), now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(filterBase + rpmNorm * 460 + throttle * 220, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.08 + throttle * 0.08 + rpmNorm * 0.05, now, 0.05);
    }

    let noiseVol = 0;
    let noiseFreq = 900;
    if (surface === 'water' && speedKmh > 4) {
      noiseVol = Math.min(0.18, (speedKmh / 50) * 0.16);
      noiseFreq = 1350;
    } else if (surface === 'mud' && speedKmh > 4) {
      noiseVol = Math.min(0.14, (speedKmh / 45) * 0.12);
      noiseFreq = 450;
    } else if (skidIntensity > 0.15) {
      noiseVol = Math.min(0.16, skidIntensity * 0.14);
      noiseFreq = surface === 'asphalt' ? 1750 : 720;
    }
    this.noiseFilter.frequency.setTargetAtTime(noiseFreq, now, 0.06);
    this.noiseGain.gain.setTargetAtTime(noiseVol, now, 0.06);
  }

  playStarterCrank() {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t0 = now + i * 0.09;
      osc.frequency.setValueAtTime(95, t0);
      osc.frequency.linearRampToValueAtTime(140, t0 + 0.06);
      g.gain.setValueAtTime(0.11, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.075);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.08);
    }
  }

  playGearShift() {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playDoorToggle() {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playCoin() {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.11);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playCheckpoint(isFinish = false) {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = isFinish ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  playBump(strength = 0.5) {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);
    gain.gain.setValueAtTime(Math.min(0.28, strength * 0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
