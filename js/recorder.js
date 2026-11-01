const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export function recordingSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
}

/** Wraps MediaRecorder with pause/resume, elapsed time that excludes pauses, and a 0–1 input level. */
export class Recorder {
  constructor({ onLevel, onTick }) {
    this.onLevel = onLevel;
    this.onTick = onTick;
    this.state = "idle";
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.context = null;
    this.analyser = null;
    this.frame = 0;
    this.timer = 0;
    this.elapsedBeforePause = 0;
    this.segmentStart = 0;
  }

  get elapsedSeconds() {
    const running = this.state === "recording" ? performance.now() - this.segmentStart : 0;
    return (this.elapsedBeforePause + running) / 1000;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mimeType = PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start(1000);

    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.context.createMediaStreamSource(this.stream).connect(this.analyser);

    this.elapsedBeforePause = 0;
    this.segmentStart = performance.now();
    this.state = "recording";
    this.watchLevel();
    this.timer = setInterval(() => this.onTick(this.elapsedSeconds), 250);
  }

  watchLevel() {
    const samples = new Float32Array(this.analyser.fftSize);
    const step = () => {
      if (!this.analyser) return;
      if (this.state === "recording") {
        this.analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const rms = Math.sqrt(sum / samples.length);
        this.onLevel(Math.min(1, rms * 6));
      } else {
        this.onLevel(0);
      }
      this.frame = requestAnimationFrame(step);
    };
    step();
  }

  pause() {
    if (this.state !== "recording") return;
    this.mediaRecorder.pause();
    this.elapsedBeforePause += performance.now() - this.segmentStart;
    this.state = "paused";
    this.onTick(this.elapsedSeconds);
  }

  resume() {
    if (this.state !== "paused") return;
    this.mediaRecorder.resume();
    this.segmentStart = performance.now();
    this.state = "recording";
  }

  stop() {
    if (this.state === "idle") return Promise.resolve(null);
    const duration = this.elapsedSeconds;
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType || "audio/webm" });
        this.teardown();
        resolve({ blob, durationSeconds: duration });
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.teardown();
  }

  teardown() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.context?.close();
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.chunks = [];
    this.state = "idle";
    this.onLevel(0);
  }
}
