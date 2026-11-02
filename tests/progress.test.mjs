import assert from "node:assert/strict";
import { test } from "node:test";

import { INITIAL_PROGRESS, nextProgress, progressLabel } from "../js/model-progress.js";

function run(events) {
  return events.reduce(nextProgress, INITIAL_PROGRESS);
}

test("starts with no percentage", () => {
  assert.equal(progressLabel(INITIAL_PROGRESS), "Downloading Whisper…");
});

test("per-file estimate never shows 100% without an aggregate", () => {
  const state = run([{ status: "progress", file: "a.onnx", loaded: 10, total: 10 }]);
  assert.equal(state.fraction, 0.99);
  assert.equal(state.phase, "downloading");
});

test("per-file estimate never moves backward when a new file starts", () => {
  const state = run([
    { status: "progress", file: "small.json", loaded: 5, total: 10 },
    { status: "progress", file: "big.onnx", loaded: 0, total: 1000 },
  ]);
  assert.equal(state.fraction, 0.5);
});

test("aggregate total replaces an earlier high estimate", () => {
  const state = run([
    { status: "progress", file: "small.json", loaded: 10, total: 10 },
    { status: "progress_total", loaded: 410, total: 1000 },
  ]);
  assert.equal(state.fraction, 0.41);
  assert.equal(progressLabel(state), "Downloading Whisper: 41%");
});

test("aggregate is monotonic and ignores later per-file events", () => {
  const state = run([
    { status: "progress_total", loaded: 600, total: 1000 },
    { status: "progress_total", loaded: 500, total: 1000 },
    { status: "progress", file: "x", loaded: 1, total: 1000 },
  ]);
  assert.equal(state.fraction, 0.6);
});

test("full download switches to the preparing message instead of freezing", () => {
  const state = run([{ status: "progress_total", loaded: 1000, total: 1000 }]);
  assert.equal(state.phase, "preparing");
  assert.match(progressLabel(state), /Download finished/);
});

test("ready is final", () => {
  const state = run([{ status: "ready" }, { status: "progress_total", loaded: 1, total: 1000 }]);
  assert.equal(state.phase, "ready");
  assert.equal(progressLabel(state), "Whisper is ready.");
});

test("malformed events leave state unchanged", () => {
  assert.equal(nextProgress(INITIAL_PROGRESS, null), INITIAL_PROGRESS);
  assert.equal(nextProgress(INITIAL_PROGRESS, { status: "progress_total", loaded: 1, total: 0 }), INITIAL_PROGRESS);
  assert.equal(nextProgress(INITIAL_PROGRESS, { status: "done", file: "never-started" }), INITIAL_PROGRESS);
});
