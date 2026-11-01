import assert from "node:assert/strict";
import { test } from "node:test";

import { availableTags, dateFilterTitle, filterNotes, hasActiveFilters, matchesDate } from "../js/filters.js";
import { clock, durationShort, durationSpoken, noteToMarkdown } from "../js/format.js";
import { detectTags, draftTitle, organize, splitSentences, toActionItem } from "../js/organize.js";
import { NoteStore, SectionStore } from "../js/store.js";

const NOW = new Date(2026, 10, 4, 15, 0, 0); // Wednesday, Nov 4 2026, local time

function note(title, { days = 0, tags = [], section = "General", status = "ready", summary = "" } = {}) {
  const created = new Date(NOW);
  created.setDate(created.getDate() - days);
  return { id: title, title, type: "Meeting", tags, section, status, summary, createdAt: created.toISOString() };
}

const FIXTURES = [
  note("Mixer planning", { tags: ["SHPE"], summary: "Split the budget." }),
  note("CAD bracket", { days: 1, tags: ["CAD"] }),
  note("Budget split", { days: 40, tags: ["SHPE"], status: "failed" }),
  note("Design review", { days: 2, tags: ["SHPE", "Design"], section: "ASME" }),
];

function titles(notes) {
  return notes.map((n) => n.title);
}

test("tag filter alone keeps only that tag within the section", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", tag: "SHPE" }, NOW)), ["Mixer planning", "Budget split"]);
});

test("tag plus date filter intersect", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", tag: "SHPE", dateFilter: "thisWeek" }, NOW)), ["Mixer planning"]);
});

test("Needs Fix shows failed notes only", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", dateFilter: "needsFix" }, NOW)), ["Budget split"]);
});

test("search matches title, summary, and tags case-insensitively", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", query: "BUDGET" }, NOW)), ["Mixer planning", "Budget split"]);
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", query: "cad" }, NOW)), ["CAD bracket"]);
});

test("section scoping and all four filters together", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "ASME" }, NOW)), ["Design review"]);
  assert.deepEqual(
    titles(filterNotes(FIXTURES, { section: "General", query: "mixer", tag: "SHPE", dateFilter: "today" }, NOW)),
    ["Mixer planning"],
  );
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General", query: "mixer", tag: "CAD", dateFilter: "today" }, NOW)), []);
});

test("results are newest first", () => {
  assert.deepEqual(titles(filterNotes(FIXTURES, { section: "General" }, NOW)), ["Mixer planning", "CAD bracket", "Budget split"]);
});

test("date ranges: today, week starting Sunday, month", () => {
  assert.equal(matchesDate(note("a", { days: 0 }), "today", NOW), true);
  assert.equal(matchesDate(note("b", { days: 1 }), "today", NOW), false);
  assert.equal(matchesDate(note("c", { days: 3 }), "thisWeek", NOW), true); // Sunday Nov 1
  assert.equal(matchesDate(note("d", { days: 4 }), "thisWeek", NOW), false); // Saturday Oct 31
  assert.equal(matchesDate(note("e", { days: 3 }), "thisMonth", NOW), true);
  assert.equal(matchesDate(note("f", { days: 4 }), "thisMonth", NOW), false);
  assert.throws(() => dateFilterTitle("yesterday"));
});

test("available tags are per section and sorted", () => {
  assert.deepEqual(availableTags(FIXTURES, "General"), ["CAD", "SHPE"]);
  assert.deepEqual(availableTags(FIXTURES, "ASME"), ["Design", "SHPE"]);
  assert.equal(hasActiveFilters({ query: "  " }), false);
  assert.equal(hasActiveFilters({ tag: "CAD" }), true);
});

test("organize keeps the speaker's sentences and pulls out action items", () => {
  const transcript = "Um, so we planned the Tuesday mixer for about 30 people. We split the budget into food, merch, and a reserve. "
    + "Food takes 60% of the $400 budget. I need to send the RSVP form by Friday. We should confirm the pizza order.";
  const draft = organize(transcript, { existingTags: ["SHPE"] });
  assert.equal(draft.title, "We planned the Tuesday mixer for about…");
  assert.equal(draft.summary, "We planned the Tuesday mixer for about 30 people. We split the budget into food, merch, and a reserve.");
  assert.deepEqual(draft.keyPoints, ["Food takes 60% of the $400 budget."]);
  assert.deepEqual(draft.actionItems.map((item) => item.text), ["Send the RSVP form by Friday", "Confirm the pizza order"]);
  assert.deepEqual(draft.tags, ["SHPE"]);
  for (const point of [...draft.keyPoints, draft.summary]) {
    assert.ok(transcript.includes(point.split(" ").slice(1, 4).join(" ")), `"${point}" should come from the transcript`);
  }
});

test("organize handles empty and fragment-only input without inventing content", () => {
  assert.deepEqual(organize(""), { title: "Untitled voice log", summary: "", keyPoints: [], actionItems: [], tags: [] });
  assert.deepEqual(splitSentences("uh okay. yes."), []);
});

test("title, action, and tag helpers", () => {
  assert.equal(draftTitle(["Short title here."], "x"), "Short title here");
  assert.equal(toActionItem("I'll book the ice bath for Thursday."), "Book the ice bath for Thursday");
  assert.equal(toActionItem("We need to ask about the safety factor."), "Ask about the safety factor");
  assert.deepEqual(detectTags("OK OK, the SHPE mixer, the CAD model, SHPE dues, plus #design"), ["SHPE", "design"]);
});

test("durations match the iOS wording", () => {
  assert.equal(durationShort(312), "5 min, 12 sec");
  assert.equal(durationShort(1260), "21 min");
  assert.equal(durationShort(0), "0 sec");
  assert.equal(durationSpoken(312), "5 minutes, 12 seconds");
  assert.equal(durationSpoken(61), "1 minute, 1 second");
  assert.equal(clock(3723), "1:02:03");
  assert.equal(clock(12), "00:12");
});

test("markdown export includes every section", () => {
  const md = noteToMarkdown({
    title: "T", type: "Meeting", createdAt: NOW.toISOString(), durationSeconds: 65, tags: ["SHPE"],
    summary: "S.", keyPoints: ["K."], actionItems: [{ text: "A", done: true }], manualNotes: "M", transcript: "X",
  });
  for (const fragment of ["# T", "1 min, 5 sec", "Tags: SHPE", "## Summary", "- K.", "- [x] A", "## My notes", "## Transcript"]) {
    assert.ok(md.includes(fragment), fragment);
  }
});

class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

test("a corrupt notes entry is left untouched and saving pauses", () => {
  const storage = new MemoryStorage({ "jarvis.notes.v1": "{ not json" });
  const store = new NoteStore(storage);
  store.load();
  assert.equal(store.allowsWrites, false);
  assert.equal(store.upsert({ id: "x" }), false);
  assert.equal(storage.getItem("jarvis.notes.v1"), "{ not json");
});

test("notes interrupted mid-transcription reload as failed", () => {
  const storage = new MemoryStorage({ "jarvis.notes.v1": JSON.stringify([{ id: "a", status: "transcribing" }, { id: "b", status: "ready" }]) });
  const store = new NoteStore(storage);
  store.load();
  assert.equal(store.get("a").status, "failed");
  assert.equal(store.get("b").status, "ready");
});

test("sections reject duplicates and remember the selection", () => {
  const storage = new MemoryStorage();
  const sections = new SectionStore(storage);
  assert.equal(sections.add("ASME"), true);
  assert.equal(sections.add("asme"), false);
  assert.equal(new SectionStore(storage).selected, "ASME");
});
