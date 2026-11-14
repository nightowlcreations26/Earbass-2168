// A DJ deck: buffer player → trim → 3-band EQ → filter → volume → crossfader channel.

export type DeckSource = { title: string; artist?: string; bpm?: number | null; cover?: string | null };

export class Deck {
  ctx: AudioContext;
  buffer: AudioBuffer | null = null;
  info: DeckSource | null = null;
  peaks: Float32Array | null = null;
  rate = 1;
  playing = false;
  cues: (number | null)[] = [null, null, null, null];
  private src: AudioBufferSourceNode | null = null;
  private offset = 0;
  private startedAt = 0;
  private low: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private high: BiquadFilterNode;
  private lp: BiquadFilterNode;
  private hp: BiquadFilterNode;
  private vol: GainNode;
  channel: GainNode;
  analyser: AnalyserNode;
  private input: GainNode;
  onEnd?: () => void;

  constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.low = ctx.createBiquadFilter();
    this.low.type = "lowshelf";
    this.low.frequency.value = 250;
    this.mid = ctx.createBiquadFilter();
    this.mid.type = "peaking";
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.8;
    this.high = ctx.createBiquadFilter();
    this.high.type = "highshelf";
    this.high.frequency.value = 3500;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.frequency.value = 22000;
    this.lp.Q.value = 4;
    this.hp = ctx.createBiquadFilter();
    this.hp.type = "highpass";
    this.hp.frequency.value = 10;
    this.hp.Q.value = 4;
    this.vol = ctx.createGain();
    this.vol.gain.value = 0.85;
    this.channel = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.input.connect(this.low).connect(this.mid).connect(this.high).connect(this.lp).connect(this.hp).connect(this.vol).connect(this.channel).connect(out);
    this.vol.connect(this.analyser);
  }

  load(buffer: AudioBuffer, info: DeckSource) {
    this.pause();
    this.buffer = buffer;
    this.info = info;
    this.offset = 0;
    this.cues = [null, null, null, null];
    this.peaks = computePeaks(buffer, 600);
  }

  get duration() {
    return this.buffer?.duration ?? 0;
  }

  get position() {
    if (!this.playing) return this.offset;
    const p = this.offset + (this.ctx.currentTime - this.startedAt) * this.rate;
    return this.duration ? Math.min(p, this.duration) : p;
  }

  play() {
    if (!this.buffer || this.playing) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this.rate;
    src.connect(this.input);
    const at = Math.min(this.offset, this.duration - 0.01);
    src.start(0, Math.max(0, at));
    src.onended = () => {
      if (this.src === src) {
        this.playing = false;
        this.offset = 0;
        this.src = null;
        this.onEnd?.();
      }
    };
    this.src = src;
    this.startedAt = this.ctx.currentTime;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.position;
    const s = this.src;
    this.src = null;
    this.playing = false;
    try {
      s?.stop();
    } catch {
      /* already stopped */
    }
  }

  seek(t: number) {
    const was = this.playing;
    this.pause();
    this.offset = Math.max(0, Math.min(t, this.duration - 0.05));
    if (was) this.play();
  }

  setRate(r: number) {
    if (this.playing) {
      this.offset = this.position;
      this.startedAt = this.ctx.currentTime;
    }
    this.rate = r;
    this.src?.playbackRate.setTargetAtTime(r, this.ctx.currentTime, 0.01);
  }

  /** dB values, -40 = kill */
  setEq(low: number, mid: number, high: number) {
    const now = this.ctx.currentTime;
    this.low.gain.setTargetAtTime(low, now, 0.02);
    this.mid.gain.setTargetAtTime(mid, now, 0.02);
    this.high.gain.setTargetAtTime(high, now, 0.02);
  }

  /** -1 LP .. 0 .. 1 HP */
  setFilter(f: number) {
    const now = this.ctx.currentTime;
    this.lp.frequency.setTargetAtTime(f < 0 ? 150 * Math.pow(140, 1 + f) : 22000, now, 0.03);
    this.hp.frequency.setTargetAtTime(f > 0 ? 20 * Math.pow(200, f) : 10, now, 0.03);
  }

  setVolume(v: number) {
    this.vol.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setChannel(v: number) {
    this.channel.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
  }

  /** Vinyl brake: pitch slides to zero, then pauses. */
  tapeStop(seconds = 0.9) {
    if (!this.src) return;
    const s = this.src;
    const now = this.ctx.currentTime;
    s.playbackRate.cancelScheduledValues(now);
    s.playbackRate.setValueAtTime(this.rate, now);
    s.playbackRate.linearRampToValueAtTime(0.01, now + seconds);
    window.setTimeout(() => {
      if (this.src === s) {
        this.offset = this.position - (this.rate * seconds) / 2;
        this.pause();
      }
    }, seconds * 1000);
  }

  /** Beat-roll: repeatedly retrigger a short slice at the current position. */
  stutter(sliceSec: number, repeats: number) {
    if (!this.buffer || !this.playing) return;
    const anchor = this.position;
    this.pause();
    const now = this.ctx.currentTime;
    for (let i = 0; i < repeats; i++) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.buffer;
      s.playbackRate.value = this.rate;
      const g = this.ctx.createGain();
      s.connect(g).connect(this.input);
      const t = now + (i * sliceSec) / this.rate;
      g.gain.setValueAtTime(1, t);
      g.gain.setValueAtTime(1, t + sliceSec / this.rate - 0.005);
      g.gain.linearRampToValueAtTime(0, t + sliceSec / this.rate);
      s.start(t, anchor, sliceSec);
    }
    window.setTimeout(() => {
      this.offset = anchor + sliceSec * repeats;
      this.play();
    }, ((sliceSec * repeats) / this.rate) * 1000);
  }

  level() {
    const d = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(d);
    return d;
  }
}

function computePeaks(b: AudioBuffer, n: number) {
  const ch = b.getChannelData(0);
  const size = Math.floor(ch.length / n);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * size; j < (i + 1) * size; j += 16) {
      const v = Math.abs(ch[j]);
      if (v > m) m = v;
    }
    out[i] = m;
  }
  let max = 0;
  out.forEach((v) => (max = Math.max(max, v)));
  if (max > 0) for (let i = 0; i < n; i++) out[i] /= max;
  return out;
}
