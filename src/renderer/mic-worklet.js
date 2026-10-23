// Runs in the audio thread: collects microphone samples and hands them over in ~100 ms blocks.
class MicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(1600);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf.slice(0));
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('mic-capture', MicCapture);
