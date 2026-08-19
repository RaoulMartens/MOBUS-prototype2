export class FarmSoundEffects {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterFilter = null;
    this.masterCompressor = null;
    this.noiseBuffer = null;
    this.activeWater = new Map();
    this.activeDigging = new Map();
    this.lastDockAt = 0;
    this.ambient = null;
    this.ambientTimer = null;
    this.ambientMusicTimer = null;
  }

  random(min, max) {
    return min + Math.random() * (max - min);
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterGain.gain.value = 0.44;
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 2350;
      this.masterFilter.Q.value = 0.22;
      this.masterCompressor.threshold.value = -25;
      this.masterCompressor.knee.value = 24;
      this.masterCompressor.ratio.value = 2.2;
      this.masterCompressor.attack.value = 0.018;
      this.masterCompressor.release.value = 0.34;
      this.masterGain.connect(this.masterFilter);
      this.masterFilter.connect(this.masterCompressor);
      this.masterCompressor.connect(this.ctx.destination);

      // A longer, softly coloured noise bed avoids the brittle sound and obvious
      // repetition of short white-noise buffers.
      const length = this.ctx.sampleRate * 11;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);
      let smoothNoise = 0;
      for (let index = 0; index < length; index++) {
        const whiteNoise = Math.random() * 2 - 1;
        smoothNoise = smoothNoise * 0.985 + whiteNoise * 0.015;
        samples[index] = Math.max(-1, Math.min(1, smoothNoise * 2.7 + whiteNoise * 0.1));
      }
    } catch (error) {
      console.warn('Web Audio API is niet beschikbaar.', error);
    }
  }

  ready() {
    this.init();
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  connectWithPan(node, destination, pan = 0) {
    if (!this.ctx.createStereoPanner) {
      node.connect(destination);
      return;
    }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(panner);
    panner.connect(destination);
  }

  output(node, pan = 0) {
    this.connectWithPan(node, this.masterGain || this.ctx.destination, pan);
  }

  tone({ frequency, endFrequency = frequency, duration = 0.12, volume = 0.04, delay = 0, type = 'sine' }) {
    if (!this.ready()) return;
    const pitchVariation = this.random(0.988, 1.012);
    const variedDuration = duration * this.random(0.94, 1.08);
    const variedVolume = volume * this.random(0.82, 1);
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.detune.value = this.random(-7, 7);
    oscillator.frequency.setValueAtTime(Math.max(20, frequency * pitchVariation), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency * pitchVariation), start + variedDuration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(variedVolume, start + Math.min(0.032, variedDuration * 0.32));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + variedDuration);
    oscillator.connect(gain);
    this.output(gain, this.random(-0.16, 0.16));
    oscillator.start(start);
    oscillator.stop(start + variedDuration + 0.03);
  }

  noise({ frequency = 900, endFrequency = frequency, duration = 0.18, volume = 0.025, delay = 0, q = 1.2, type = 'bandpass' }) {
    if (!this.ready() || !this.noiseBuffer) return;
    const frequencyVariation = this.random(0.9, 1.08);
    const variedDuration = duration * this.random(0.9, 1.12);
    const variedVolume = volume * this.random(0.76, 0.98);
    const start = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.Q.setValueAtTime(q * this.random(0.86, 1.08), start);
    filter.frequency.setValueAtTime(Math.max(30, frequency * frequencyVariation), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency * frequencyVariation), start + variedDuration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(variedVolume, start + Math.min(0.06, variedDuration * 0.34));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + variedDuration);
    source.connect(filter);
    filter.connect(gain);
    this.output(gain, this.random(-0.22, 0.22));
    source.start(start, this.random(0, Math.max(0.1, this.noiseBuffer.duration - variedDuration - 0.1)));
    source.stop(start + variedDuration + 0.03);
  }

  playUiTap() {
    this.tone({ frequency: 310, endFrequency: 225, duration: 0.07, volume: 0.018, type: 'triangle' });
    this.noise({ frequency: 590, endFrequency: 340, duration: 0.065, volume: 0.005, q: 0.65 });
  }

  playStart() {
    [247, 330, 392].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.02, duration: 0.23, volume: 0.024, delay: index * 0.085, type: 'triangle' });
    });
    this.noise({ frequency: 780, endFrequency: 350, duration: 0.36, volume: 0.01, delay: 0.04, q: 0.8 });
  }

  playToolLift(tool) {
    const pitches = { input: 440, move: 245, connect: 340 };
    const pitch = pitches[tool] || 350;
    this.tone({ frequency: pitch, endFrequency: pitch * 1.1, duration: 0.11, volume: 0.023, type: 'triangle' });
    this.noise({ frequency: tool === 'input' ? 880 : 590, endFrequency: 330, duration: 0.13, volume: 0.008, q: 0.85 });
  }

  playToolDock() {
    const now = performance.now();
    if (now - this.lastDockAt < 90) return;
    this.lastDockAt = now;
    this.tone({ frequency: 275, endFrequency: 170, duration: 0.12, volume: 0.027, type: 'triangle' });
    this.noise({ frequency: 440, endFrequency: 210, duration: 0.15, volume: 0.009, q: 0.6 });
  }

  playSeedPull() {
    this.noise({ frequency: 960, endFrequency: 440, duration: 0.21, volume: 0.016, q: 1.05 });
    this.tone({ frequency: 460, endFrequency: 620, duration: 0.1, volume: 0.015, delay: 0.07, type: 'triangle' });
  }

  playPlant() {
    this.noise({ frequency: 370, endFrequency: 145, duration: 0.2, volume: 0.025, q: 0.55, type: 'lowpass' });
    this.tone({ frequency: 340, endFrequency: 560, duration: 0.14, volume: 0.027, delay: 0.055 });
    this.tone({ frequency: 520, endFrequency: 680, duration: 0.15, volume: 0.012, delay: 0.13, type: 'triangle' });
  }

  playShovel() {
    this.noise({ frequency: 700, endFrequency: 135, duration: 0.4, volume: 0.034, q: 0.62 });
    this.tone({ frequency: 205, endFrequency: 115, duration: 0.15, volume: 0.029, delay: 0.15, type: 'triangle' });
  }

  startDigging(participant) {
    if (!this.ready() || !this.noiseBuffer || this.activeDigging.has(participant)) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const texture = this.ctx.createGain();
    const envelope = this.ctx.createGain();
    const pulse = this.ctx.createOscillator();
    const pulseDepth = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = this.random(330, 410);
    filter.Q.value = 0.58;
    texture.gain.value = 0.0046;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(1, now + 0.1);
    pulse.type = 'sine';
    pulse.frequency.value = this.random(2.05, 2.5);
    pulseDepth.gain.value = 0.0018;

    source.connect(filter);
    filter.connect(texture);
    pulse.connect(pulseDepth);
    pulseDepth.connect(texture.gain);
    texture.connect(envelope);
    this.output(envelope);
    source.start(now, this.random(0, this.noiseBuffer.duration - 1));
    pulse.start(now);
    this.activeDigging.set(participant, { source, pulse, envelope });
  }

  stopDigging(participant) {
    const digging = this.activeDigging.get(participant);
    if (!digging || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (digging.envelope.gain.cancelAndHoldAtTime) digging.envelope.gain.cancelAndHoldAtTime(now);
    else digging.envelope.gain.cancelScheduledValues(now);
    digging.envelope.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    digging.source.stop(now + 0.14);
    digging.pulse.stop(now + 0.14);
    this.activeDigging.delete(participant);
  }

  stopAllDigging() {
    [...this.activeDigging.keys()].forEach(participant => this.stopDigging(participant));
  }

  playGold() {
    this.noise({ frequency: 1650, endFrequency: 680, duration: 0.5, volume: 0.012, q: 1.6 });
    [520, 660, 880].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.015, duration: 0.34, volume: 0.02, delay: index * 0.075, type: 'sine' });
    });
  }

  playConnect() {
    [260, 390, 520].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 0.985, duration: 0.27 - index * 0.035, volume: 0.026 - index * 0.005, delay: index * 0.025, type: 'triangle' });
    });
    this.noise({ frequency: 650, endFrequency: 285, duration: 0.22, volume: 0.009, q: 1.2 });
  }

  playGroup() {
    this.playConnect();
    this.tone({ frequency: 220, endFrequency: 330, duration: 0.3, volume: 0.024, delay: 0.11, type: 'triangle' });
  }

  playSnoei() {
    this.tone({ frequency: 710, endFrequency: 340, duration: 0.12, volume: 0.012, type: 'triangle' });
    this.noise({ frequency: 1180, endFrequency: 310, duration: 0.46, volume: 0.024, delay: 0.035, q: 1.25 });
  }

  playEdit() {
    this.tone({ frequency: 420, endFrequency: 650, duration: 0.11, volume: 0.025, type: 'triangle' });
  }

  playKeyTap() {
    this.tone({ frequency: 470, endFrequency: 275, duration: 0.045, volume: 0.008, type: 'triangle' });
  }

  startWater(participant) {
    if (!this.ready() || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const existing = this.activeWater.get(participant);
    if (existing) {
      if (existing.stopTimer) window.clearTimeout(existing.stopTimer);
      existing.stopTimer = null;
      existing.stopping = false;
      if (existing.gain.gain.cancelAndHoldAtTime) existing.gain.gain.cancelAndHoldAtTime(now);
      else existing.gain.gain.cancelScheduledValues(now);
      existing.gain.gain.linearRampToValueAtTime(0.0062, now + 0.18);
      return;
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = this.random(590, 690);
    filter.Q.value = 0.28;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.0062, now + 0.38);
    source.connect(filter);
    filter.connect(gain);
    this.output(gain);
    source.playbackRate.value = this.random(0.93, 1.07);
    source.start(now, this.random(0, this.noiseBuffer.duration - 1));
    this.activeWater.set(participant, { source, gain, stopTimer: null, stopping: false });
    this.tone({ frequency: 430, endFrequency: 335, duration: 0.2, volume: 0.0038, type: 'triangle' });
  }

  stopWater(participant) {
    const water = this.activeWater.get(participant);
    if (!water || !this.ctx || water.stopping) return;
    const now = this.ctx.currentTime;
    water.stopping = true;
    if (water.gain.gain.cancelAndHoldAtTime) water.gain.gain.cancelAndHoldAtTime(now);
    else water.gain.gain.cancelScheduledValues(now);
    water.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    water.stopTimer = window.setTimeout(() => {
      if (this.activeWater.get(participant) !== water || !water.stopping) return;
      water.source.stop();
      this.activeWater.delete(participant);
    }, 340);
  }

  stopAllWater() {
    [...this.activeWater.keys()].forEach(participant => this.stopWater(participant));
  }

  startAmbient() {
    if (this.ambient || !this.ready() || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const bus = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1650;
    filter.Q.value = 0.3;
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(0.52, now + 3.5);
    bus.connect(filter);
    this.output(filter);

    const voices = [
      { frequency: 130.81, volume: 0.0016, detune: -4 },
      { frequency: 196, volume: 0.0008, detune: 3 }
    ].map(({ frequency, volume, detune }) => {
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(bus);
      oscillator.start(now);
      return oscillator;
    });

    const breeze = this.ctx.createBufferSource();
    const breezeFilter = this.ctx.createBiquadFilter();
    const breezeGain = this.ctx.createGain();
    breeze.buffer = this.noiseBuffer;
    breeze.loop = true;
    breeze.playbackRate.value = 0.73;
    breezeFilter.type = 'lowpass';
    breezeFilter.frequency.value = 540;
    breezeFilter.Q.value = 0.2;
    breezeGain.gain.value = 0.007;
    breeze.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    this.connectWithPan(breezeGain, bus, -0.18);
    breeze.start(now, this.random(0, this.noiseBuffer.duration - 1));

    const leaves = this.ctx.createBufferSource();
    const leavesFilter = this.ctx.createBiquadFilter();
    const leavesGain = this.ctx.createGain();
    leaves.buffer = this.noiseBuffer;
    leaves.loop = true;
    leaves.playbackRate.value = 1.13;
    leavesFilter.type = 'bandpass';
    leavesFilter.frequency.value = 820;
    leavesFilter.Q.value = 0.42;
    leavesGain.gain.value = 0.0017;
    leaves.connect(leavesFilter);
    leavesFilter.connect(leavesGain);
    this.connectWithPan(leavesGain, bus, 0.24);
    leaves.start(now, this.random(0, this.noiseBuffer.duration - 1));

    const movement = this.ctx.createOscillator();
    const movementDepth = this.ctx.createGain();
    movement.type = 'sine';
    movement.frequency.value = 0.011;
    movementDepth.gain.value = 100;
    movement.connect(movementDepth);
    movementDepth.connect(breezeFilter.frequency);
    movement.start(now);

    const leafMovement = this.ctx.createOscillator();
    const leafMovementDepth = this.ctx.createGain();
    leafMovement.type = 'sine';
    leafMovement.frequency.value = 0.017;
    leafMovementDepth.gain.value = 0.00055;
    leafMovement.connect(leafMovementDepth);
    leafMovementDepth.connect(leavesGain.gain);
    leafMovement.start(now);

    this.ambient = {
      bus,
      voices,
      sources: [breeze, leaves, movement, leafMovement]
    };
    this.scheduleAmbientMoment(true);
    this.scheduleAmbientMusicPhrase(true);
  }

  scheduleAmbientMoment(initial = false) {
    if (!this.ambient) return;
    if (this.ambientTimer) window.clearTimeout(this.ambientTimer);
    const delay = initial ? this.random(2500, 6000) : this.random(9000, 22000);
    this.ambientTimer = window.setTimeout(() => {
      this.playAmbientMoment();
      this.scheduleAmbientMoment();
    }, delay);
  }

  playAmbientMoment() {
    if (!this.ambient || !this.ready()) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const isLeafRustle = Math.random() < 0.7;
    const duration = isLeafRustle ? this.random(2.2, 4.8) : this.random(3.8, 7.2);
    const peak = isLeafRustle ? this.random(0.0022, 0.0042) : this.random(0.0018, 0.0034);
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = this.random(0.66, 1.18);
    filter.type = isLeafRustle ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isLeafRustle ? this.random(520, 980) : this.random(260, 480), now);
    filter.frequency.linearRampToValueAtTime(isLeafRustle ? this.random(390, 720) : this.random(320, 560), now + duration);
    filter.Q.value = isLeafRustle ? this.random(0.32, 0.68) : 0.18;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + duration * this.random(0.28, 0.46));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    this.connectWithPan(gain, this.ambient.bus, this.random(-0.72, 0.72));
    source.start(now, this.random(0, Math.max(0.1, this.noiseBuffer.duration - duration - 0.1)));
    source.stop(now + duration + 0.05);
  }

  scheduleAmbientMusicPhrase(initial = false) {
    if (!this.ambient) return;
    if (this.ambientMusicTimer) window.clearTimeout(this.ambientMusicTimer);
    const delay = initial ? this.random(1200, 2500) : this.random(6500, 12500);
    this.ambientMusicTimer = window.setTimeout(() => {
      this.playAmbientMusicPhrase();
      this.scheduleAmbientMusicPhrase();
    }, delay);
  }

  playAmbientMusicPhrase() {
    if (!this.ambient || !this.ready()) return;
    const now = this.ctx.currentTime;
    const scale = [196, 220, 246.94, 293.66, 329.63, 392];
    const patterns = [
      [0, 2, 3, 2],
      [1, 3, 4],
      [2, 1, 3, 5],
      [0, 1, 3, 4],
      [3, 2, 1]
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const stepDuration = this.random(0.58, 0.78);
    const transpose = Math.random() < 0.34 ? 1 : 0;

    pattern.forEach((scaleIndex, noteIndex) => {
      const start = now + noteIndex * stepDuration + this.random(-0.025, 0.025);
      const duration = this.random(1.35, 2.05);
      const frequency = scale[Math.min(scale.length - 1, scaleIndex + transpose)];
      const oscillator = this.ctx.createOscillator();
      const harmonic = this.ctx.createOscillator();
      const harmonicGain = this.ctx.createGain();
      const noteFilter = this.ctx.createBiquadFilter();
      const envelope = this.ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency * 1.006, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.12);
      harmonic.type = 'sine';
      harmonic.frequency.value = frequency * 2;
      harmonicGain.gain.value = 0.12;
      noteFilter.type = 'lowpass';
      noteFilter.frequency.value = this.random(1150, 1550);
      noteFilter.Q.value = 0.25;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.linearRampToValueAtTime(this.random(0.008, 0.011), start + 0.055);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(noteFilter);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(noteFilter);
      noteFilter.connect(envelope);
      this.connectWithPan(envelope, this.ambient.bus, this.random(-0.42, 0.42));
      oscillator.start(start);
      harmonic.start(start);
      oscillator.stop(start + duration + 0.04);
      harmonic.stop(start + duration + 0.04);
    });
  }

  stopAmbient() {
    if (this.ambientTimer) window.clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
    if (this.ambientMusicTimer) window.clearTimeout(this.ambientMusicTimer);
    this.ambientMusicTimer = null;
    if (!this.ambient || !this.ctx) return;
    const ambient = this.ambient;
    const now = this.ctx.currentTime;
    if (ambient.bus.gain.cancelAndHoldAtTime) ambient.bus.gain.cancelAndHoldAtTime(now);
    else ambient.bus.gain.cancelScheduledValues(now);
    ambient.bus.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    [...ambient.voices, ...ambient.sources].forEach(source => source.stop(now + 2.3));
    this.ambient = null;
  }

  playStickerPeel() {
    this.noise({ frequency: 1180, endFrequency: 520, duration: 0.18, volume: 0.015, q: 1.05 });
    this.tone({ frequency: 360, endFrequency: 495, duration: 0.1, volume: 0.013, delay: 0.06, type: 'triangle' });
  }

  playStickerPlace() {
    this.tone({ frequency: 350, endFrequency: 215, duration: 0.12, volume: 0.028, type: 'triangle' });
    this.noise({ frequency: 510, endFrequency: 215, duration: 0.14, volume: 0.008, q: 0.62 });
  }

  playStickerReturn() {
    this.tone({ frequency: 260, endFrequency: 430, duration: 0.15, volume: 0.021, type: 'triangle' });
  }

  playHarvestEnter() {
    [277, 349, 440].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.025, duration: 0.29, volume: 0.023, delay: index * 0.085, type: 'triangle' });
    });
    this.noise({ frequency: 980, endFrequency: 390, duration: 0.56, volume: 0.011, q: 0.85 });
  }

  playHarvestComplete() {
    [247, 330, 415, 554].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.01, duration: 0.48, volume: 0.027, delay: index * 0.105, type: 'triangle' });
    });
    this.noise({ frequency: 1450, endFrequency: 520, duration: 0.76, volume: 0.013, delay: 0.1, q: 1.25 });
  }

  playSend() {
    this.noise({ frequency: 880, endFrequency: 390, duration: 0.28, volume: 0.011, q: 0.9 });
    this.tone({ frequency: 390, endFrequency: 650, duration: 0.2, volume: 0.021, delay: 0.045, type: 'triangle' });
  }

  playSuccess() {
    [330, 415, 554].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.012, duration: 0.4, volume: 0.027, delay: index * 0.1, type: 'triangle' });
    });
  }

  playConnectionSeed() {
    this.playPlant();
  }

  playConnectionWarmth(strength = 0.5) {
    const safeStrength = Math.max(0, Math.min(1, strength));
    this.noise({
      frequency: 760 - safeStrength * 290,
      endFrequency: 410,
      duration: 0.18 + safeStrength * 0.08,
      volume: 0.007 + safeStrength * 0.01,
      q: 1.05 + safeStrength * 0.55
    });
  }

  playConnectionConfirm() {
    this.playEdit();
  }

  playConnectionFade() {
    this.noise({ frequency: 820, endFrequency: 270, duration: 0.5, volume: 0.021, q: 1.25 });
  }

  playGrowth() {
    this.playPlant();
    setTimeout(() => this.playConnect(), 70);
  }
}
