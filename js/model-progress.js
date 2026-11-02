// Turns transformers.js loading events into one progress value that never moves backward.
// Downloads can finish while the engine is still compiling, which used to look like a frozen percentage.

export const INITIAL_PROGRESS = Object.freeze({ phase: "downloading", fraction: null, files: {}, hasTotal: false });

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function sum(files, key) {
  return Object.values(files).reduce((total, entry) => total + (entry[key] || 0), 0);
}

/** Returns the next progress state for one loading event; unknown events leave the state unchanged. */
export function nextProgress(state, event) {
  if (!event || typeof event.status !== "string") return state;
  if (state.phase === "ready") return state;

  switch (event.status) {
    case "progress_total": {
      if (!(event.total > 0)) return state;
      // The aggregate knows every file up front, so it replaces any per-file estimate made before it arrived.
      const exact = clamp01(event.loaded / event.total);
      const fraction = state.hasTotal ? Math.max(state.fraction ?? 0, exact) : exact;
      return { ...state, hasTotal: true, fraction, phase: fraction >= 1 ? "preparing" : "downloading" };
    }
    case "progress": {
      if (!event.file || !(event.total > 0)) return state;
      const files = { ...state.files, [event.file]: { loaded: event.loaded, total: event.total } };
      if (state.hasTotal) return { ...state, files };
      // Without an aggregate, files not yet started are unknown, so this estimate is shown but not trusted as 100%.
      const estimate = Math.min(0.99, clamp01(sum(files, "loaded") / sum(files, "total")));
      return { ...state, files, fraction: Math.max(state.fraction ?? 0, estimate) };
    }
    case "done": {
      if (!event.file) return state;
      const previous = state.files[event.file];
      if (!previous) return state;
      const files = { ...state.files, [event.file]: { loaded: previous.total, total: previous.total } };
      const allDone = Object.values(files).every((entry) => entry.loaded >= entry.total);
      return { ...state, files, phase: allDone && state.hasTotal && state.fraction >= 1 ? "preparing" : state.phase };
    }
    case "ready":
      return { ...state, phase: "ready", fraction: 1 };
    default:
      return state;
  }
}

/** Plain-language status for the engine while it loads. */
export function progressLabel(state) {
  switch (state.phase) {
    case "downloading":
      return state.fraction === null ? "Downloading Whisper…" : `Downloading Whisper: ${Math.floor(state.fraction * 100)}%`;
    case "preparing":
      return "Download finished. Starting Whisper on this device (can take up to a minute)…";
    case "ready":
      return "Whisper is ready.";
    default:
      throw new Error(`Unknown progress phase: ${state.phase}`);
  }
}
