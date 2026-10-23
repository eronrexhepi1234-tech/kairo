// Real-time pitch shifter for the voice changer: two read heads glide through a delay line
// at a different speed than it is written, crossfaded so there are no clicks.
class PitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'ratio', defaultValue: 1, minValue: 0.4, maxValue: 2.5 }]; }
  constructor() {
    super();
    this.size = 4096; this.buf = new Float32Array(this.size); this.w = 0;
    this.win = 1600; this.phase = 0;
  }
  process(inputs, outputs, params) {
    const inp = inputs[0][0], out = outputs[0][0];
    if (!out) return true;
    const ratio = params.ratio[0], N = this.size, W = this.win;
    for (let i = 0; i < out.length; i++) {
      this.buf[this.w] = inp ? inp[i] : 0;
      // phase runs 0..W, the read heads sit "phase" and "phase+W/2" samples behind the writer
      this.phase = (this.phase + (1 - ratio) + W) % W;
      const d1 = this.phase, d2 = (this.phase + W / 2) % W;
      const read = d => { const p = (this.w - d - 1 + N) % N, i0 = Math.floor(p), f = p - i0; return this.buf[i0] * (1 - f) + this.buf[(i0 + 1) % N] * f; };
      const g1 = Math.sin(Math.PI * d1 / W), g2 = Math.sin(Math.PI * d2 / W);
      out[i] = read(d1) * g1 + read(d2) * g2;
      this.w = (this.w + 1) % N;
    }
    for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
    return true;
  }
}
registerProcessor('pitch-shifter', PitchShifter);
