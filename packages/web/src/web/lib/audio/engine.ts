// Web Audio engine shared by Beat Pad and Mix Pad: synth voices, FX rack, recorder.

let _ctx: AudioContext | null = null;
export function getCtx() {
  if (!_ctx) _ctx = new AudioContext({ latencyHint: "interactive" });
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

let _noise: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext) {
  if (_noise) return _noise;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  _noise = b;
  return b;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

export type Kit = "club" | "808" | "dnb" | "boosted" | "latin";
export const KITS: { id: Kit; label: string }[] = [
  { id: "club", label: "Club 909" },
  { id: "808", label: "Night 808" },
  { id: "dnb", label: "DnB Breaks" },
  { id: "boosted", label: "Bass Boosted" },
  { id: "latin", label: "Mextech Latin" },
];

export const VOICES = [
  { id: "kick", label: "Kick", key: "1", color: "#ff3da5" },
  { id: "snare", label: "Snare", key: "2", color: "#ff7ac6" },
  { id: "clap", label: "Clap", key: "3", color: "#ffb3da" },
  { id: "hat", label: "Hat", key: "4", color: "#c6ff3d" },
  { id: "openhat", label: "Open Hat", key: "5", color: "#a3e635" },
  { id: "perc", label: "Perc", key: "6", color: "#f0abfc" },
  { id: "bass", label: "Bass", key: "7", color: "#c026d3" },
  { id: "stab", label: "Stab", key: "8", color: "#e879f9" },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];

const ROOT_BASS = 55; // A1
const ROOT_STAB = 220; // A3
const semi = (f: number, n: number) => f * Math.pow(2, n / 12);

export function triggerVoice(ctx: AudioContext, out: AudioNode, id: VoiceId, t: number, vel = 1, kit: Kit = "club", note = 0) {
  const g = ctx.createGain();
  g.connect(out);
  switch (id) {
    case "kick": {
      const o = ctx.createOscillator();
      o.type = "sine";
      const start = kit === "808" || kit === "boosted" ? 120 : kit === "dnb" ? 180 : 150;
      const end = kit === "808" || kit === "boosted" ? 38 : 48;
      const dec = kit === "808" ? 0.9 : kit === "boosted" ? 1.1 : kit === "dnb" ? 0.35 : 0.45;
      o.frequency.setValueAtTime(start, t);
      o.frequency.exponentialRampToValueAtTime(end, t + 0.12);
      env(g, t, 1.1 * vel, 0.002, dec);
      if (kit === "boosted") {
        const ws = ctx.createWaveShaper();
        ws.curve = driveCurve(40);
        o.connect(ws).connect(g);
      } else o.connect(g);
      // click
      const c = ctx.createOscillator();
      const cg = ctx.createGain();
      c.type = "square";
      c.frequency.value = 1800;
      env(cg, t, 0.12 * vel, 0.001, 0.012);
      c.connect(cg).connect(out);
      c.start(t);
      c.stop(t + 0.03);
      o.start(t);
      o.stop(t + dec + 0.1);
      break;
    }
    case "snare": {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = kit === "dnb" ? 1500 : 1000;
      const ng = ctx.createGain();
      env(ng, t, 0.7 * vel, 0.001, kit === "dnb" ? 0.16 : 0.2);
      n.connect(hp).connect(ng).connect(g);
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(kit === "dnb" ? 260 : 200, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      const og = ctx.createGain();
      env(og, t, 0.6 * vel, 0.001, 0.1);
      o.connect(og).connect(g);
      g.gain.value = 1;
      n.start(t);
      n.stop(t + 0.3);
      o.start(t);
      o.stop(t + 0.2);
      break;
    }
    case "clap": {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 0.9;
      n.connect(bp).connect(g);
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((d) => {
        g.gain.setValueAtTime(0.8 * vel, t + d);
        g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.009);
      });
      g.gain.setValueAtTime(0.7 * vel, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.033 + 0.18);
      n.start(t);
      n.stop(t + 0.3);
      break;
    }
    case "hat":
    case "openhat": {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7500;
      const dec = id === "hat" ? 0.045 : 0.3;
      env(g, t, (id === "hat" ? 0.35 : 0.3) * vel, 0.001, dec);
      n.connect(hp).connect(g);
      n.start(t, Math.random());
      n.stop(t + dec + 0.05);
      break;
    }
    case "perc": {
      const o = ctx.createOscillator();
      o.type = "sine";
      const base = kit === "latin" ? 330 : 240;
      const f = semi(base, note);
      o.frequency.setValueAtTime(f * 1.6, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      env(g, t, 0.6 * vel, 0.001, kit === "latin" ? 0.22 : 0.12);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.3);
      break;
    }
    case "bass": {
      const f = semi(ROOT_BASS, note);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = kit === "dnb" ? 6 : 8;
      lp.frequency.setValueAtTime(kit === "808" ? 300 : 1400, t);
      lp.frequency.exponentialRampToValueAtTime(kit === "808" ? 200 : 180, t + 0.22);
      const dec = kit === "808" || kit === "boosted" ? 0.6 : 0.24;
      env(g, t, 0.55 * vel, 0.004, dec);
      const oscs: OscillatorNode[] = [];
      const detunes = kit === "dnb" ? [-14, 14] : [0];
      for (const dt of detunes) {
        const o = ctx.createOscillator();
        o.type = kit === "808" ? "sine" : "sawtooth";
        o.frequency.value = f;
        o.detune.value = dt;
        oscs.push(o);
        o.connect(lp);
      }
      if (kit === "boosted" || kit === "808") {
        const ws = ctx.createWaveShaper();
        ws.curve = driveCurve(kit === "boosted" ? 60 : 8);
        lp.connect(ws).connect(g);
      } else lp.connect(g);
      oscs.forEach((o) => {
        o.start(t);
        o.stop(t + dec + 0.1);
      });
      break;
    }
    case "stab": {
      const f = semi(ROOT_STAB, note);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(600, t + 0.25);
      lp.connect(g);
      env(g, t, 0.18 * vel, 0.003, 0.3);
      [0, 3, 7].forEach((iv) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = semi(f, iv);
        o.connect(lp);
        o.start(t);
        o.stop(t + 0.4);
      });
      break;
    }
  }
}

export function driveCurve(k: number) {
  const n = 1024;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return c;
}

function crushCurve(bits: number) {
  const n = 4096;
  const steps = Math.pow(2, bits);
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

function impulse(ctx: BaseAudioContext, seconds = 2.6, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

/** Wet/dry block around an effect chain. */
function wetDry(ctx: AudioContext, fxIn: AudioNode, fxOut: AudioNode) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0;
  input.connect(dry).connect(output);
  input.connect(fxIn);
  fxOut.connect(wet).connect(output);
  return {
    input,
    output,
    setMix(m: number, insert = true) {
      const now = ctx.currentTime;
      wet.gain.setTargetAtTime(m, now, 0.02);
      dry.gain.setTargetAtTime(insert ? 1 - m * 0.6 : 1, now, 0.02);
    },
  };
}

export type FxState = {
  filter: number; // -1 (LP) .. 0 .. 1 (HP)
  bass: number; // 0..1 → 0..18dB low shelf
  drive: number; // 0..1
  crush: number; // 0..1
  flanger: number; // 0..1
  delay: number; // 0..1
  reverb: number; // 0..1
};
export const FX_DEFAULT: FxState = { filter: 0, bass: 0, drive: 0, crush: 0, flanger: 0, delay: 0, reverb: 0 };

export class FxRack {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;
  analyser: AnalyserNode;
  private lp: BiquadFilterNode;
  private hp: BiquadFilterNode;
  private shelf: BiquadFilterNode;
  private driveBlk;
  private driveWs: WaveShaperNode;
  private crushBlk;
  private crushWs: WaveShaperNode;
  private flBlk;
  private dlBlk;
  private dl: DelayNode;
  private rvBlk;
  private recordDest: MediaStreamAudioDestinationNode;

  constructor(ctx: AudioContext, destination: AudioNode = ctx.destination) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.frequency.value = 22000;
    this.lp.Q.value = 6;
    this.hp = ctx.createBiquadFilter();
    this.hp.type = "highpass";
    this.hp.frequency.value = 10;
    this.hp.Q.value = 6;
    this.shelf = ctx.createBiquadFilter();
    this.shelf.type = "lowshelf";
    this.shelf.frequency.value = 90;

    this.driveWs = ctx.createWaveShaper();
    this.driveWs.curve = driveCurve(50);
    this.driveWs.oversample = "4x";
    const driveTrim = ctx.createGain();
    driveTrim.gain.value = 0.5;
    this.driveWs.connect(driveTrim);
    this.driveBlk = wetDry(ctx, this.driveWs, driveTrim);

    this.crushWs = ctx.createWaveShaper();
    this.crushWs.curve = crushCurve(4);
    this.crushBlk = wetDry(ctx, this.crushWs, this.crushWs);

    const fl = ctx.createDelay(0.05);
    fl.delayTime.value = 0.005;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.25;
    const depth = ctx.createGain();
    depth.gain.value = 0.003;
    lfo.connect(depth).connect(fl.delayTime);
    lfo.start();
    const flFb = ctx.createGain();
    flFb.gain.value = 0.6;
    fl.connect(flFb).connect(fl);
    this.flBlk = wetDry(ctx, fl, fl);

    this.dl = ctx.createDelay(2);
    this.dl.delayTime.value = 0.375;
    const dlFb = ctx.createGain();
    dlFb.gain.value = 0.45;
    const dlTone = ctx.createBiquadFilter();
    dlTone.type = "lowpass";
    dlTone.frequency.value = 3500;
    this.dl.connect(dlTone).connect(dlFb).connect(this.dl);
    this.dlBlk = wetDry(ctx, this.dl, dlTone);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx);
    this.rvBlk = wetDry(ctx, conv, conv);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.input
      .connect(this.shelf)
      .connect(this.lp)
      .connect(this.hp)
      .connect(this.driveBlk.input);
    this.driveBlk.output.connect(this.crushBlk.input);
    this.crushBlk.output.connect(this.flBlk.input);
    this.flBlk.output.connect(this.dlBlk.input);
    this.dlBlk.output.connect(this.rvBlk.input);
    this.rvBlk.output.connect(comp).connect(this.output);
    this.output.connect(this.analyser);
    this.output.connect(destination);
    this.recordDest = ctx.createMediaStreamDestination();
    this.output.connect(this.recordDest);
  }

  set(fx: FxState, bpm = 128) {
    const now = this.ctx.currentTime;
    const f = fx.filter;
    this.lp.frequency.setTargetAtTime(f < 0 ? 200 * Math.pow(100, 1 + f) : 22000, now, 0.03);
    this.hp.frequency.setTargetAtTime(f > 0 ? 20 * Math.pow(250, f) : 10, now, 0.03);
    this.shelf.gain.setTargetAtTime(fx.bass * 18, now, 0.03);
    this.driveBlk.setMix(fx.drive);
    this.crushWs.curve = crushCurve(Math.round(8 - fx.crush * 6));
    this.crushBlk.setMix(fx.crush > 0 ? 0.4 + fx.crush * 0.6 : 0);
    this.flBlk.setMix(fx.flanger * 0.8, false);
    this.dl.delayTime.setTargetAtTime((60 / bpm) * 0.75, now, 0.05);
    this.dlBlk.setMix(fx.delay * 0.7, false);
    this.rvBlk.setMix(fx.reverb * 0.8, false);
  }

  level() {
    const d = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(d);
    return d;
  }

  record() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(this.recordDest.stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start();
    return {
      stop: () =>
        new Promise<Blob>((res) => {
          rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          rec.stop();
        }),
    };
  }
}

/** One-shot DJ effects for the Mix Pad's FX pads. */
export function riser(ctx: AudioContext, out: AudioNode, seconds = 4) {
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx);
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 4;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(9000, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + seconds);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.15);
  n.connect(bp).connect(g).connect(out);
  n.start(t);
  n.stop(t + seconds + 0.2);
}

export function airhorn(ctx: AudioContext, out: AudioNode) {
  const t = ctx.currentTime;
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  g.connect(out);
  [0, 0.18, 0.36].forEach((d, i) => {
    const len = i === 2 ? 0.6 : 0.14;
    [466, 470, 698].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t + d);
      og.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02);
      og.gain.setValueAtTime(0.12, t + d + len);
      og.gain.exponentialRampToValueAtTime(0.0001, t + d + len + 0.05);
      o.connect(og).connect(lp);
      o.start(t + d);
      o.stop(t + d + len + 0.1);
    });
  });
  lp.connect(g);
}

export function subDrop(ctx: AudioContext, out: AudioNode) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
  const g = ctx.createGain();
  env(g, t, 1, 0.01, 1.8);
  const ws = ctx.createWaveShaper();
  ws.curve = driveCurve(10);
  o.connect(ws).connect(g).connect(out);
  o.start(t);
  o.stop(t + 2);
}

export function laser(ctx: AudioContext, out: AudioNode) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(2400, t);
  o.frequency.exponentialRampToValueAtTime(120, t + 0.35);
  const g = ctx.createGain();
  env(g, t, 0.2, 0.002, 0.38);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.45);
}

export async function decodeUrl(ctx: AudioContext, url: string) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return ctx.decodeAudioData(buf);
}
