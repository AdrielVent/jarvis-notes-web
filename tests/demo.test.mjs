import assert from "node:assert/strict";
import { test } from "node:test";

import { demoNotes } from "../js/demo.js";

test("demo notes are synthetic, unique, and lead with the space examples", () => {
  const notes = demoNotes(new Date(2026, 10, 4, 15));
  assert.equal(new Set(notes.map((n) => n.id)).size, notes.length);
  assert.ok(notes.every((n) => n.demo === true));
  assert.deepEqual(notes.slice(0, 3).map((n) => n.title), [
    "Bracket vibration test log",
    "CubeSat thermal team meeting",
    "STAR story draft: fixture deadline",
  ]);
  assert.ok(notes[0].transcript.includes("412"));
});
