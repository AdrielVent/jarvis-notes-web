// Notes live in this browser's localStorage only. Audio is never stored; it stays in memory for the session.

const NOTES_KEY = "jarvis.notes.v1";
const SECTIONS_KEY = "jarvis.sections.v1";
const SELECTED_SECTION_KEY = "jarvis.selectedSection.v1";
export const DEFAULT_SECTION = "General";

export class NoteStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.notes = [];
    this.allowsWrites = true;
    this.loadError = null;
  }

  /** An unreadable notes entry is left exactly as it is, and saving pauses until a reload succeeds. */
  load() {
    const raw = this.storage.getItem(NOTES_KEY);
    if (raw === null) {
      this.notes = [];
      this.allowsWrites = true;
      this.loadError = null;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("The saved notes are not a list.");
      this.notes = parsed.map(reviveInterruptedNote);
      this.allowsWrites = true;
      this.loadError = null;
    } catch (error) {
      this.notes = [];
      this.allowsWrites = false;
      this.loadError = error instanceof Error ? error.message : String(error);
    }
  }

  save() {
    if (!this.allowsWrites) return false;
    this.storage.setItem(NOTES_KEY, JSON.stringify(this.notes));
    return true;
  }

  get(id) {
    return this.notes.find((note) => note.id === id) ?? null;
  }

  upsert(note) {
    if (!this.allowsWrites) return false;
    const index = this.notes.findIndex((existing) => existing.id === note.id);
    if (index === -1) this.notes.push(note);
    else this.notes[index] = note;
    return this.save();
  }

  update(id, changes) {
    const note = this.get(id);
    if (!note) return null;
    const next = { ...note, ...changes, updatedAt: new Date().toISOString() };
    this.upsert(next);
    return next;
  }

  remove(id) {
    if (!this.allowsWrites) return false;
    this.notes = this.notes.filter((note) => note.id !== id);
    return this.save();
  }

  removeWhere(predicate) {
    if (!this.allowsWrites) return false;
    this.notes = this.notes.filter((note) => !predicate(note));
    return this.save();
  }

  clearAll() {
    this.storage.removeItem(NOTES_KEY);
    this.storage.removeItem(SECTIONS_KEY);
    this.storage.removeItem(SELECTED_SECTION_KEY);
    this.load();
  }
}

/** A reload during transcription loses the in-memory audio, so the note can only be marked failed. */
function reviveInterruptedNote(note) {
  if (note.status === "transcribing" || note.status === "organizing") {
    return { ...note, status: "failed", error: "The page was closed before this note finished. The audio was not saved, so record it again or add notes by hand." };
  }
  return note;
}

export class SectionStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.sections = this.readSections();
    const saved = storage.getItem(SELECTED_SECTION_KEY);
    this.selected = saved && this.sections.includes(saved) ? saved : DEFAULT_SECTION;
  }

  readSections() {
    try {
      const parsed = JSON.parse(this.storage.getItem(SECTIONS_KEY) ?? "null");
      if (Array.isArray(parsed) && parsed.every((name) => typeof name === "string")) {
        return [DEFAULT_SECTION, ...parsed.filter((name) => name !== DEFAULT_SECTION)];
      }
    } catch {
      // Fall through to the default list.
    }
    return [DEFAULT_SECTION];
  }

  persist() {
    this.storage.setItem(SECTIONS_KEY, JSON.stringify(this.sections));
    this.storage.setItem(SELECTED_SECTION_KEY, this.selected);
  }

  select(name) {
    if (!this.sections.includes(name)) return;
    this.selected = name;
    this.persist();
  }

  add(name) {
    const trimmed = name.trim();
    if (!trimmed || this.sections.some((existing) => existing.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      return false;
    }
    this.sections.push(trimmed);
    this.selected = trimmed;
    this.persist();
    return true;
  }
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
