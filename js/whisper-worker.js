// Runs Whisper in a worker so recording and scrolling stay smooth while the model works.
// The library and model are pinned; audio never leaves this browser.

const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js";
const MODEL = "onnx-community/whisper-tiny.en";
const MODEL_REVISION = "2575352d61be1bf7225cf8f8b268a4678025fc58";

import { INITIAL_PROGRESS, nextProgress } from "./model-progress.js";

let asrPromise = null;
let progress = INITIAL_PROGRESS;

function reportProgress(event) {
  const next = nextProgress(progress, event);
  if (next === progress) return;
  progress = next;
  self.postMessage({ type: "progress", phase: progress.phase, fraction: progress.fraction });
}

// A static cross-origin import kills a module worker before it can report anything (Chromium gives
// onerror an empty message); importing at runtime turns a blocked or offline CDN into a normal error.
async function createPipeline() {
  const { env, pipeline } = await import(LIBRARY);
  env.allowLocalModels = false;
  return pipeline("automatic-speech-recognition", MODEL, {
    revision: MODEL_REVISION,
    dtype: "q8",
    device: "wasm",
    progress_callback: reportProgress,
  });
}

function loadModel() {
  asrPromise ??= createPipeline().catch((error) => {
    asrPromise = null;
    progress = INITIAL_PROGRESS;
    throw error;
  });
  return asrPromise;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    switch (type) {
      case "load": {
        await loadModel();
        self.postMessage({ id, type: "ready" });
        break;
      }
      case "transcribe": {
        const asr = await loadModel();
        self.postMessage({ id, type: "ready" });
        const output = await asr(data.audio, { chunk_length_s: 30, stride_length_s: 5 });
        self.postMessage({ id, type: "result", text: (output.text ?? "").trim() });
        break;
      }
      default:
        throw new Error(`Unknown worker message: ${type}`);
    }
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
