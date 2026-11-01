export const ENGINE_LABEL = "Whisper tiny.en, on this device";
export const SAMPLE_RATE = 16000;

/** Decodes any browser-playable recording to 16 kHz mono, the input Whisper expects. */
export async function decodeToMono16k(blob) {
  const buffer = await blob.arrayBuffer();
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const audio = await context.decodeAudioData(buffer);
    if (audio.numberOfChannels === 1) return new Float32Array(audio.getChannelData(0));
    const mono = new Float32Array(audio.length);
    for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
      const data = audio.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) mono[i] += data[i] / audio.numberOfChannels;
    }
    return mono;
  } finally {
    await context.close();
  }
}

export class Transcriber {
  constructor() {
    this.worker = null;
    this.nextId = 1;
    this.pending = new Map();
    this.state = "idle";
    this.progress = null;
    this.listeners = new Set();
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }

  ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./whisper-worker.js", import.meta.url), { type: "module" });
    this.worker.onmessage = ({ data }) => this.handle(data);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.failAll(event.message || "The transcription engine could not start.");
      this.worker?.terminate();
      this.worker = null;
    };
    return this.worker;
  }

  handle(data) {
    if (data.type === "progress") {
      if (this.state !== "ready") {
        this.state = "downloading";
        this.progress = data.total ? data.loaded / data.total : null;
        this.emit();
      }
      return;
    }
    const request = this.pending.get(data.id);
    if (data.type === "ready") {
      this.state = "ready";
      this.progress = null;
      this.emit();
      if (request?.kind === "load") {
        this.pending.delete(data.id);
        request.resolve();
      }
      return;
    }
    if (!request) return;
    this.pending.delete(data.id);
    if (data.type === "result") request.resolve(data.text);
    else request.reject(new Error(data.message));
    if (data.type === "error" && this.state !== "ready") {
      this.state = "failed";
      this.emit();
    }
  }

  failAll(message) {
    for (const request of this.pending.values()) request.reject(new Error(message));
    this.pending.clear();
    this.state = "failed";
    this.emit();
  }

  send(kind, message, transfer = []) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { kind, resolve, reject });
      if (this.state === "idle" || this.state === "failed") {
        this.state = "loading";
        this.emit();
      }
      this.ensureWorker().postMessage({ ...message, id }, transfer);
    });
  }

  prepare() {
    if (this.state === "ready") return Promise.resolve();
    return this.send("load", { type: "load" });
  }

  /** Takes 16 kHz mono samples from `decodeToMono16k`; the buffer is transferred to the worker. */
  transcribe(samples) {
    return this.send("transcribe", { type: "transcribe", audio: samples }, [samples.buffer]);
  }
}
