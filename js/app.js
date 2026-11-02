import { demoNotes } from "./demo.js";
import { DATE_FILTERS, availableTags, dateFilterTitle, filterNotes, hasActiveFilters } from "./filters.js";
import { clock, dateLong, dateShort, durationShort, durationSpoken, noteToMarkdown } from "./format.js";
import { progressLabel } from "./model-progress.js";
import { organize } from "./organize.js";
import { Recorder, recordingSupported } from "./recorder.js";
import { DEFAULT_SECTION, NoteStore, SectionStore, newId } from "./store.js";
import { ENGINE_LABEL, SAMPLE_RATE, Transcriber, decodeToMono16k } from "./transcriber.js";

const NOTE_TYPES = ["Meeting", "Work Log", "Research", "Brain Dump"];
const DESKTOP = window.matchMedia("(min-width: 960px)");

const store = new NoteStore();
store.load();
const sections = new SectionStore();
const transcriber = new Transcriber();
const audioById = new Map();
const audioUrlById = new Map();

const ui = { query: "", dateFilter: "any", tag: null, selected: "new", detailOpen: false };
const draft = { type: "Work Log", tags: "", manualNotes: "" };
let recorderStatus = recordingSupported() ? "ready" : "unsupported";
let recorderMessage = "";
let mounted = { view: null, key: null };
let renderQueued = false;

const recorder = new Recorder({ onLevel: updateMeter, onTick: updateClock });

const $ = (id) => document.getElementById(id);
const el = {
  search: $("search"),
  sectionSelect: $("section-select"),
  addSection: $("add-section"),
  dateFilter: $("date-filter"),
  tagRow: $("tag-row"),
  tagFilter: $("tag-filter"),
  count: $("notes-count"),
  list: $("note-list"),
  empty: $("empty-state"),
  loadError: $("load-error"),
  loadErrorDetail: $("load-error-detail"),
  retryLoad: $("retry-load"),
  demoBanner: $("demo-banner"),
  demoCta: $("demo-cta"),
  demoCtaButton: $("demo-cta-button"),
  removeDemo: $("remove-demo"),
  deck: $("record-deck"),
  deckLed: $("deck-led"),
  recordButton: $("record-button"),
  recordLabel: $("record-button-label"),
  detail: $("detail-pane"),
  offline: $("offline-banner"),
  aboutDialog: $("about-dialog"),
  engineStatus: $("engine-status"),
  prepareEngine: $("prepare-engine"),
  loadDemo: $("load-demo"),
  deleteAll: $("delete-all"),
  sectionDialog: $("section-dialog"),
  sectionForm: $("section-form"),
  sectionName: $("section-name"),
  sectionError: $("section-error"),
  sectionCancel: $("section-cancel"),
  live: $("live-region"),
};

// MARK: Helpers

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function icon(name) {
  return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function announce(message) {
  el.live.textContent = "";
  setTimeout(() => { el.live.textContent = message; }, 50);
}

function parseTags(text) {
  const tags = text.split(/[,#]/).map((tag) => tag.trim().slice(0, 24)).filter(Boolean);
  return [...new Set(tags)].slice(0, 8);
}

function isProcessing(note) {
  return note.status === "transcribing" || note.status === "organizing";
}

function isRecordingActive() {
  return recorderStatus === "recording" || recorderStatus === "paused";
}

function engineProgressText() {
  switch (transcriber.state) {
    case "idle": return "Not downloaded in this session yet. It downloads automatically the first time you transcribe.";
    case "loading": return "Starting Whisper…";
    case "downloading": return transcriber.progress ? progressLabel(transcriber.progress) : "Downloading Whisper…";
    case "ready": return `Ready: ${ENGINE_LABEL} (transformers.js 4.3.2).`;
    case "failed": return "Couldn't load Whisper. Check your connection and try again.";
    default: throw new Error(`Unknown engine state: ${transcriber.state}`);
  }
}

function statusOf(note) {
  switch (note.status) {
    case "ready": return null;
    case "organizing": return { kind: "processing", text: "Writing notes…" };
    case "transcribing": {
      if (transcriber.state === "downloading" || transcriber.state === "loading") {
        return { kind: "processing", text: engineProgressText() };
      }
      return { kind: "processing", text: "Transcribing on this device…" };
    }
    case "failed": return { kind: "failed", text: note.error || "Something went wrong." };
    default: throw new Error(`Unknown note status: ${note.status}`);
  }
}

function statusHTML(status) {
  const glyph = status.kind === "processing" ? '<span class="spinner" aria-hidden="true"></span>' : icon("warning");
  return `<span class="status ${status.kind}">${glyph}<span>${esc(status.text)}</span></span>`;
}

function spokenDescription(note) {
  const parts = [note.title, note.type, dateLong(note.createdAt)];
  if (note.durationSeconds) parts.push(durationSpoken(note.durationSeconds));
  if (note.tags?.length) parts.push(`Tag ${note.tags.join(", ")}`);
  if (note.demo) parts.push("Demo note");
  const status = statusOf(note);
  if (status) parts.push(status.text);
  else if (note.summary) parts.push(note.summary);
  return parts.join(", ");
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

// MARK: List

function renderSelectors(tags) {
  el.sectionSelect.innerHTML = sections.sections
    .map((name) => `<option value="${esc(name)}"${name === sections.selected ? " selected" : ""}>${esc(name)}</option>`)
    .join("");
  el.dateFilter.innerHTML = DATE_FILTERS
    .map((filter) => `<option value="${filter}"${filter === ui.dateFilter ? " selected" : ""}>${dateFilterTitle(filter)}</option>`)
    .join("");
  el.tagRow.hidden = tags.length === 0;
  el.tagFilter.innerHTML = `<option value="">All Tags</option>${tags
    .map((tag) => `<option value="${esc(tag)}"${tag === ui.tag ? " selected" : ""}>${esc(tag)}</option>`)
    .join("")}`;
}

function rowHTML(note) {
  const meta = [note.type, dateShort(note.createdAt)];
  if (note.durationSeconds) meta.push(durationShort(note.durationSeconds));
  if (note.tags?.length) meta.push(note.tags.join(", "));
  const status = statusOf(note);
  const body = status ? statusHTML(status) : note.summary ? `<span class="note-preview">${esc(note.summary)}</span>` : "";
  const badge = note.demo ? '<span class="demo-badge" aria-hidden="true">DEMO</span>' : "";
  return `<li><button type="button" class="note-row" data-id="${esc(note.id)}"${ui.selected === note.id ? ' aria-current="true"' : ""} aria-label="${esc(spokenDescription(note))}">
    <span class="note-text"><span class="note-title">${esc(note.title)}${badge}</span><span class="note-meta">${esc(meta.join(" · "))}</span>${body}</span>${icon("chevron-right")}</button></li>`;
}

function emptyStateHTML() {
  if (!store.allowsWrites) {
    return `${icon("lock")}<h2>Notes Unavailable</h2><p>Your saved notes are still in this browser. Use Retry above to load them again.</p>`;
  }
  if (ui.query.trim()) {
    return `${icon("search")}<h2>No Results for “${esc(ui.query.trim())}”</h2><p>Check the spelling or try a different search.</p>`;
  }
  if (hasActiveFilters(ui)) {
    return `${icon("calendar")}<h2>No Matching Notes</h2><p>No notes in ${esc(sections.selected)} match these filters.</p>
      <div class="empty-actions"><button type="button" class="secondary-button" data-action="clear-filters">Clear Filters</button></div>`;
  }
  const demoButton = store.notes.length === 0
    ? '<button type="button" class="secondary-button" data-action="load-demo">Load Demo Notes</button>'
    : "";
  return `${icon("mic")}<h2>No Notes in ${esc(sections.selected)}</h2><p>Record a voice log and VNUA LOCK will transcribe it and write organized notes.</p>
    <div class="empty-actions">${demoButton}</div>`;
}

function renderList() {
  const tags = availableTags(store.notes, sections.selected);
  if (ui.tag !== null && !tags.includes(ui.tag)) ui.tag = null;
  renderSelectors(tags);

  const notes = filterNotes(store.notes, { section: sections.selected, query: ui.query, dateFilter: ui.dateFilter, tag: ui.tag });
  const processing = notes.filter(isProcessing).length;
  el.count.hidden = notes.length === 0;
  el.count.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}${processing ? ` · ${processing} processing` : ""}`;

  const focusedId = document.activeElement?.closest?.(".note-row")?.dataset.id;
  el.list.hidden = notes.length === 0;
  el.list.innerHTML = notes.map(rowHTML).join("");
  if (focusedId) el.list.querySelector(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();

  el.empty.hidden = notes.length !== 0;
  if (notes.length === 0) el.empty.innerHTML = emptyStateHTML();

  el.loadError.hidden = store.allowsWrites;
  el.loadErrorDetail.textContent = store.loadError ? `Details: ${store.loadError}` : "";
  el.demoBanner.hidden = !store.notes.some((note) => note.demo);
  // The empty state already offers demo notes, so the banner only appears once real notes exist.
  el.demoCta.hidden = !store.allowsWrites || store.notes.length === 0 || store.notes.some((note) => note.demo);
  el.offline.hidden = navigator.onLine;
}

function renderDeck() {
  const recording = isRecordingActive();
  const away = recording && ui.selected !== "new";
  const full = away ? "Return to Recording" : recording ? "Recording…" : "Record Voice Log";
  el.recordLabel.textContent = full;
  el.recordButton.setAttribute("aria-label", full);
  el.deckLed.classList.toggle("on", recorderStatus === "recording");
}

// MARK: Detail pane

function headerHTML(title) {
  return `<div class="pane-header">
    <button type="button" class="secondary-button back-button" data-action="back">${icon("chevron-left")}Notes</button>
    <h2 id="detail-title" tabindex="-1">${esc(title)}</h2></div>`;
}

function keyHTML(action, label, glyph, extraClass = "", disabled = false) {
  return `<button type="button" class="key ${extraClass}" data-action="${action}"${disabled ? " disabled" : ""}>
    <span class="key-face">${icon(glyph)}</span><span>${esc(label)}</span></button>`;
}

function keysHTML() {
  switch (recorderStatus) {
    case "ready":
    case "error":
      return keyHTML("start", "Start Recording", "record", "key-record");
    case "denied":
    case "unsupported":
      return keyHTML("start", "Start Recording", "record", "key-record", true);
    case "starting":
      return keyHTML("start", "Starting…", "record", "key-record", true);
    case "recording":
      return keyHTML("pause", "Pause", "pause") + keyHTML("stop", "Stop and Save", "stop");
    case "paused":
      return keyHTML("resume", "Resume", "play", "key-resume") + keyHTML("stop", "Stop and Save", "stop");
    case "saving":
      return keyHTML("stop", "Saving…", "stop", "", true);
    default:
      throw new Error(`Unknown recorder status: ${recorderStatus}`);
  }
}

function lcdWord() {
  switch (recorderStatus) {
    case "ready": return "Ready";
    case "starting": return "Starting";
    case "recording": return "Recording";
    case "paused": return "Paused";
    case "saving": return "Saving";
    case "denied": return "Mic blocked";
    case "unsupported": return "No mic";
    case "error": return "Error";
    default: throw new Error(`Unknown recorder status: ${recorderStatus}`);
  }
}

function recorderHelpHTML() {
  switch (recorderStatus) {
    case "ready":
    case "starting":
      return `Press <strong>Start Recording</strong> and talk through your day. ${esc(engineProgressText())}`;
    case "recording":
      return "Recording. Pause any time; <strong>Stop and Save</strong> saves the note and transcribes it on this device.";
    case "paused":
      return "Paused. Resume to keep going, or Stop and Save.";
    case "saving":
      return "Saving the recording…";
    case "denied":
      return "Microphone access is blocked. Allow it in your browser's site settings and reload, or transcribe an audio file instead.";
    case "unsupported":
      return "This browser can't record audio here. You can still transcribe an audio file or type your notes.";
    case "error":
      return esc(recorderMessage || "The microphone couldn't start. Try again, or transcribe an audio file instead.");
    default:
      throw new Error(`Unknown recorder status: ${recorderStatus}`);
  }
}

function recorderPaneHTML() {
  const typeOptions = NOTE_TYPES.map((type) => `<option${type === draft.type ? " selected" : ""}>${type}</option>`).join("");
  return `<div class="pane">
    ${headerHTML("New Voice Log")}
    <div class="card pane-section">
      <div class="form-grid">
        <label class="field">Type<select id="draft-type">${typeOptions}</select></label>
        <label class="field">Tags <span class="field-hint">Separate with commas</span>
          <input id="draft-tags" type="text" autocomplete="off" value="${esc(draft.tags)}" placeholder="SHPE, CAD"></label>
      </div>
      <p class="footnote">Saved to <strong>${esc(sections.selected)}</strong>.</p>
    </div>
    <div class="recorder" role="group" aria-label="Recorder">
      <div class="recorder-bezel">
        <div class="grille" aria-hidden="true"></div>
        <div class="lcd">
          <span class="led" id="lcd-led" aria-hidden="true"></span>
          <span class="lcd-text">
            <span class="lcd-status" id="lcd-status" role="status"></span>
            <span class="lcd-clock" id="lcd-clock" aria-hidden="true">00:00</span>
          </span>
          <span class="meter" id="meter" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></span>
        </div>
        <div class="keys" id="keys"></div>
      </div>
    </div>
    <div class="card pane-section recorder-info">
      <p class="recorder-help" id="recorder-help"></p>
      <div class="pane-actions">
        <button type="button" class="secondary-button" data-action="upload">${icon("upload")}Transcribe an Audio File</button>
        <input type="file" id="upload-input" accept="audio/*,video/webm,video/mp4" hidden>
      </div>
    </div>
    <details class="card pane-section">
      <summary>Type notes instead</summary>
      <label class="field">My notes<textarea id="draft-notes" placeholder="What did you work on today?">${esc(draft.manualNotes)}</textarea></label>
      <p class="pane-actions"><button type="button" class="aqua-button aqua-small" data-action="save-typed">Save Note</button></p>
    </details>
  </div>`;
}

function updateRecorderUI() {
  if (mounted.view !== "new") return;
  const status = $("lcd-status");
  status.textContent = lcdWord();
  $("lcd-led").classList.toggle("on", recorderStatus === "recording");
  const focusedAction = document.activeElement?.closest?.(".key")?.dataset.action;
  $("keys").innerHTML = keysHTML();
  if (focusedAction) {
    const next = $("keys").querySelector(".key:not(:disabled)");
    next?.focus();
  }
  $("recorder-help").innerHTML = recorderHelpHTML();
  if (!isRecordingActive()) updateClock(0);
}

function updateMeter(level) {
  const meter = $("meter");
  if (!meter) return;
  const lit = Math.ceil(level * 5);
  meter.querySelectorAll("span").forEach((bar, index) => bar.classList.toggle("lit", index < lit));
}

function updateClock(seconds) {
  const display = $("lcd-clock");
  if (display) display.textContent = clock(seconds);
}

function noteKey(note) {
  const engine = isProcessing(note) ? `${transcriber.state}:${transcriber.progress?.phase ?? ""}:${Math.floor((transcriber.progress?.fraction ?? 0) * 100)}` : "";
  return `${note.id}|${note.updatedAt}|${note.status}|${engine}|${audioById.has(note.id)}`;
}

function audioUrl(id) {
  if (!audioUrlById.has(id)) audioUrlById.set(id, URL.createObjectURL(audioById.get(id)));
  return audioUrlById.get(id);
}

function notePaneHTML(note) {
  const meta = [note.type, dateLong(note.createdAt)];
  if (note.durationSeconds) meta.push(durationShort(note.durationSeconds));
  const tags = note.tags?.length ? `<ul class="tag-list" aria-label="Tags">${note.tags.map((tag) => `<li>${esc(tag)}</li>`).join("")}</ul>` : "";
  const demo = note.demo ? '<p class="footnote">Demo note: synthetic content for presentations.</p>' : "";
  const status = statusOf(note);
  const hasAudio = audioById.has(note.id);

  let statusCard = "";
  if (status?.kind === "processing") {
    statusCard = `<div class="card status-card" role="status">${statusHTML(status)}<p class="footnote">You can keep recording or browsing while this finishes. Keep this tab open.</p></div>`;
  } else if (status?.kind === "failed") {
    const retry = hasAudio
      ? `<p class="pane-actions"><button type="button" class="secondary-button" data-action="retry">${icon("retry")}Retry Transcription</button></p>`
      : "";
    statusCard = `<div class="card status-card">${statusHTML(status)}${retry}</div>`;
  }

  const blocks = [];
  if (note.summary) blocks.push(`<div class="card pane-section"><h3>Summary</h3><p>${esc(note.summary)}</p></div>`);
  if (note.keyPoints?.length) {
    blocks.push(`<div class="card pane-section"><h3>Key points</h3><ul>${note.keyPoints.map((point) => `<li>${esc(point)}</li>`).join("")}</ul></div>`);
  }
  if (note.actionItems?.length) {
    const items = note.actionItems.map((item, index) => `<li><label><input type="checkbox" data-action-item="${index}"${item.done ? " checked" : ""}>
      <span class="${item.done ? "done" : ""}">${esc(item.text)}</span></label></li>`).join("");
    blocks.push(`<div class="card pane-section"><h3>Action items</h3><ul class="action-list">${items}</ul></div>`);
  }
  if (note.manualNotes) blocks.push(`<div class="card pane-section"><h3>My notes</h3><p class="transcript">${esc(note.manualNotes)}</p></div>`);
  if (hasAudio) {
    blocks.push(`<div class="card pane-section"><h3>Recording</h3><audio class="note-audio" controls preload="metadata" src="${audioUrl(note.id)}"></audio>
      <p class="footnote">Kept in memory only. It disappears when you close this tab.</p></div>`);
  }
  if (note.transcript) {
    const open = !note.summary && !note.keyPoints?.length ? " open" : "";
    blocks.push(`<details class="card pane-section"${open}><summary>Transcript</summary><p class="transcript">${esc(note.transcript)}</p></details>`);
  }

  const organizedFootnote = note.status === "ready" && !note.demo && note.transcript
    ? '<p class="footnote">Summary, key points, and action items were picked from your own sentences on this device. Check them before sharing.</p>'
    : "";

  return `<div class="pane">
    ${headerHTML(note.title)}
    <div class="card pane-section"><p class="meta-line">${esc(meta.join(" · "))}</p>${tags}${demo}</div>
    ${statusCard}
    ${blocks.join("")}
    ${organizedFootnote}
    <div class="pane-actions">
      <button type="button" class="secondary-button" data-action="copy"${isProcessing(note) ? " disabled" : ""}>${icon("copy")}Copy as Markdown</button>
      <button type="button" class="secondary-button" data-action="download"${isProcessing(note) ? " disabled" : ""}>${icon("download")}Download .md</button>
      <button type="button" class="danger-button" data-action="delete">${icon("trash")}Delete</button>
    </div>
  </div>`;
}

function renderDetail() {
  const note = ui.selected === "new" ? null : store.get(ui.selected);
  if (!note) {
    ui.selected = "new";
    if (mounted.view !== "new") {
      el.detail.innerHTML = recorderPaneHTML();
      el.detail.setAttribute("aria-labelledby", "detail-title");
      mounted = { view: "new", key: null };
    }
    updateRecorderUI();
  } else {
    const key = noteKey(note);
    if (mounted.view !== "note" || mounted.key !== key) {
      const scroll = el.detail.scrollTop;
      el.detail.innerHTML = notePaneHTML(note);
      el.detail.setAttribute("aria-labelledby", "detail-title");
      if (mounted.view === "note" && mounted.id === note.id) el.detail.scrollTop = scroll;
      mounted = { view: "note", key, id: note.id };
    }
  }
  document.body.classList.toggle("detail-open", ui.detailOpen && !DESKTOP.matches);
}

function render() {
  renderList();
  renderDeck();
  renderDetail();
  el.engineStatus.textContent = engineProgressText();
  el.prepareEngine.disabled = transcriber.state === "ready" || transcriber.state === "downloading" || transcriber.state === "loading";
}

// MARK: Navigation

function openDetail(selection, { focus = true } = {}) {
  ui.selected = selection;
  if (!ui.detailOpen && !DESKTOP.matches) history.pushState({ detail: true }, "");
  ui.detailOpen = true;
  render();
  if (focus) {
    const target = selection === "new" && isRecordingActive() ? el.detail.querySelector(".key:not(:disabled)") : $("detail-title");
    target?.focus({ preventScroll: DESKTOP.matches });
    if (DESKTOP.matches) el.detail.scrollTop = 0;
  }
}

function closeDetail({ fromHistory = false } = {}) {
  if (!ui.detailOpen) return;
  ui.detailOpen = false;
  if (!fromHistory && !DESKTOP.matches && history.state?.detail) history.back();
  render();
  const row = el.list.querySelector(`[data-id="${CSS.escape(ui.selected)}"]`);
  (row ?? el.recordButton).focus();
}

// MARK: Recording and transcription

async function startRecording() {
  recorderStatus = "starting";
  render();
  try {
    await recorder.start();
    recorderStatus = "recording";
    announce("Recording started.");
    transcriber.prepare().catch(() => {});
  } catch (error) {
    const blocked = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    recorderStatus = blocked ? "denied" : "error";
    recorderMessage = error?.name === "NotFoundError"
      ? "No microphone was found. Connect one and try again, or transcribe an audio file instead."
      : "";
    announce(blocked ? "Microphone access is blocked." : "The microphone couldn't start.");
  }
  render();
}

async function stopRecording() {
  recorderStatus = "saving";
  render();
  const result = await recorder.stop();
  recorderStatus = "ready";
  if (result) await createAudioNote(result.blob, { durationSeconds: Math.round(result.durationSeconds) });
  else render();
}

function newNoteBase(title) {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title,
    type: draft.type,
    section: sections.selected,
    tags: parseTags(draft.tags),
    createdAt: now,
    updatedAt: now,
    durationSeconds: null,
    transcript: "",
    manualNotes: "",
    summary: "",
    keyPoints: [],
    actionItems: [],
    status: "ready",
    error: null,
    demo: false,
    engine: ENGINE_LABEL,
  };
}

function resetDraft() {
  draft.tags = "";
  draft.manualNotes = "";
  mounted = { view: null, key: null };
}

function savingPausedAlert() {
  announce("Saving is paused because the saved notes couldn't be loaded.");
  window.alert("Saving is paused because your saved notes couldn't be loaded. Use Retry at the top of the list first.");
}

async function createAudioNote(blob, { durationSeconds = null, title = "New voice log" } = {}) {
  const note = { ...newNoteBase(title), durationSeconds, status: "transcribing" };
  if (!store.upsert(note)) {
    savingPausedAlert();
    render();
    return;
  }
  audioById.set(note.id, blob);
  resetDraft();
  announce("Saved. Transcribing on this device.");
  openDetail(note.id);
  await runTranscription(note.id);
}

class StageError extends Error {}

async function runTranscription(id) {
  const blob = audioById.get(id);
  if (!blob) return;
  store.update(id, { status: "transcribing", error: null });
  scheduleRender();
  try {
    let samples;
    try {
      samples = await decodeToMono16k(blob);
    } catch {
      throw new StageError("This browser couldn't read that audio format. Try a WAV, MP3, M4A, or WebM file.");
    }
    if (samples.length < SAMPLE_RATE / 2) throw new StageError("The recording is shorter than half a second. Record a little longer.");
    const measured = Math.round(samples.length / SAMPLE_RATE);
    let text;
    try {
      text = await transcriber.transcribe(samples);
    } catch (error) {
      console.error(error);
      throw new StageError(
        navigator.onLine
          ? "Whisper couldn't run in this browser. Press Retry Transcription; if it fails again, try a recent Chrome, Edge, or Safari."
          : "Whisper couldn't load while you're offline. Reconnect, then press Retry Transcription. The audio is kept until you close this tab."
      );
    }
    const spoken = text.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (!spoken) throw new StageError("No speech was detected. Try again closer to the microphone.");

    const current = store.update(id, { status: "organizing", transcript: spoken, durationSeconds: store.get(id)?.durationSeconds ?? measured });
    scheduleRender();
    if (!current) return;
    const organized = organize(spoken, { fallbackTitle: current.title, existingTags: current.tags });
    store.update(id, { ...organized, status: "ready", error: null });
    announce(`Notes ready: ${organized.title}.`);
  } catch (error) {
    const message = error instanceof StageError ? error.message : "Something went wrong while transcribing. Press Retry Transcription.";
    if (!(error instanceof StageError)) console.error(error);
    store.update(id, { status: "failed", error: message });
    announce(`Transcription failed. ${message}`);
  }
  scheduleRender();
}

function saveTypedNote() {
  const text = draft.manualNotes.trim();
  if (!text) {
    $("draft-notes")?.focus();
    announce("Type some notes first.");
    return;
  }
  const organized = organize(text, { fallbackTitle: "Typed note", existingTags: parseTags(draft.tags) });
  const note = { ...newNoteBase(organized.title), manualNotes: text, summary: organized.summary, keyPoints: organized.keyPoints, actionItems: organized.actionItems, tags: organized.tags };
  if (!store.upsert(note)) {
    savingPausedAlert();
    return;
  }
  resetDraft();
  announce("Note saved.");
  openDetail(note.id);
}

function titleFromFileName(name) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base.charAt(0).toLocaleUpperCase() + base.slice(1) : "Uploaded audio";
}

// MARK: Data actions

function loadDemo() {
  if (!store.allowsWrites) {
    savingPausedAlert();
    return;
  }
  store.removeWhere((note) => note.demo);
  const notes = demoNotes();
  for (const note of notes) store.upsert(note);
  sections.select(DEFAULT_SECTION);
  ui.query = "";
  el.search.value = "";
  ui.dateFilter = "any";
  ui.tag = null;
  announce(`Loaded ${notes.length} demo notes.`);
  render();
}

function removeDemo() {
  store.removeWhere((note) => note.demo);
  if (ui.selected !== "new" && !store.get(ui.selected)) ui.selected = "new";
  announce("Demo notes removed.");
  render();
}

function downloadMarkdown(note) {
  const blob = new Blob([noteToMarkdown(note)], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${note.title.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "note"}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function forgetAudio(id) {
  audioById.delete(id);
  const url = audioUrlById.get(id);
  if (url) URL.revokeObjectURL(url);
  audioUrlById.delete(id);
}

// MARK: Events

el.search.addEventListener("input", () => {
  ui.query = el.search.value;
  renderList();
});
el.search.addEventListener("focus", () => document.body.classList.add("searching"));
el.search.addEventListener("blur", () => document.body.classList.remove("searching"));

el.sectionSelect.addEventListener("change", () => {
  sections.select(el.sectionSelect.value);
  ui.tag = null;
  mounted = mounted.view === "new" && !isRecordingActive() ? { view: null, key: null } : mounted;
  render();
  announce(`Section ${sections.selected}.`);
});
el.dateFilter.addEventListener("change", () => {
  ui.dateFilter = el.dateFilter.value;
  renderList();
});
el.tagFilter.addEventListener("change", () => {
  ui.tag = el.tagFilter.value || null;
  renderList();
});

el.list.addEventListener("click", (event) => {
  const row = event.target.closest(".note-row");
  if (row) openDetail(row.dataset.id);
});

el.empty.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "clear-filters") {
    ui.query = "";
    el.search.value = "";
    ui.dateFilter = "any";
    ui.tag = null;
    renderList();
    el.search.focus();
  } else if (action === "load-demo") {
    loadDemo();
  }
});

el.recordButton.addEventListener("click", () => openDetail("new"));
$("new-note-button").addEventListener("click", () => openDetail("new"));

el.retryLoad.addEventListener("click", () => {
  store.load();
  announce(store.allowsWrites ? "Notes loaded." : "Still couldn't load the saved notes.");
  render();
});
el.removeDemo.addEventListener("click", removeDemo);
el.demoCtaButton.addEventListener("click", loadDemo);

el.detail.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const note = ui.selected === "new" ? null : store.get(ui.selected);
  switch (button.dataset.action) {
    case "back": closeDetail(); break;
    case "start": await startRecording(); break;
    case "pause": recorder.pause(); recorderStatus = "paused"; announce("Paused."); render(); break;
    case "resume": recorder.resume(); recorderStatus = "recording"; announce("Recording resumed."); render(); break;
    case "stop": await stopRecording(); break;
    case "upload": $("upload-input").click(); break;
    case "save-typed": saveTypedNote(); break;
    case "retry": if (note) await runTranscription(note.id); break;
    case "copy":
      if (note) {
        try {
          await navigator.clipboard.writeText(noteToMarkdown(note));
          announce("Copied as Markdown.");
          button.lastChild.textContent = "Copied";
          setTimeout(() => { if (button.isConnected) button.lastChild.textContent = "Copy as Markdown"; }, 1500);
        } catch {
          announce("Copy isn't allowed here. Use Download .md instead.");
        }
      }
      break;
    case "download": if (note) downloadMarkdown(note); break;
    case "delete":
      if (note && window.confirm(`Delete “${note.title}”? This can't be undone.`)) {
        if (!store.remove(note.id)) {
          savingPausedAlert();
          break;
        }
        forgetAudio(note.id);
        ui.selected = "new";
        announce("Note deleted.");
        closeDetail();
        render();
      }
      break;
    default: break;
  }
});

el.detail.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.id === "draft-type") draft.type = target.value;
  if (target.id === "upload-input" && target.files?.[0]) {
    const file = target.files[0];
    target.value = "";
    await createAudioNote(file, { title: titleFromFileName(file.name) });
  }
  if (target.dataset.actionItem !== undefined) {
    const note = store.get(ui.selected);
    if (!note) return;
    const index = Number(target.dataset.actionItem);
    const actionItems = note.actionItems.map((item, i) => (i === index ? { ...item, done: target.checked } : item));
    const updated = store.update(note.id, { actionItems });
    target.nextElementSibling.classList.toggle("done", target.checked);
    if (updated) mounted.key = noteKey(updated);
  }
});

el.detail.addEventListener("input", (event) => {
  if (event.target.id === "draft-tags") draft.tags = event.target.value;
  if (event.target.id === "draft-notes") draft.manualNotes = event.target.value;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ui.detailOpen && !DESKTOP.matches && !document.querySelector("dialog[open]")) closeDetail();
});
window.addEventListener("popstate", () => closeDetail({ fromHistory: true }));
DESKTOP.addEventListener("change", render);
window.addEventListener("online", renderList);
window.addEventListener("offline", renderList);
window.addEventListener("beforeunload", (event) => {
  if (isRecordingActive() || store.notes.some(isProcessing)) event.preventDefault();
});
transcriber.onChange(scheduleRender);

// Dialogs

function openAbout() {
  el.engineStatus.textContent = engineProgressText();
  el.aboutDialog.showModal();
}
$("about-button").addEventListener("click", openAbout);
$("footer-about").addEventListener("click", openAbout);
el.prepareEngine.addEventListener("click", () => {
  transcriber.prepare().then(() => announce("Whisper is ready.")).catch(() => announce("Couldn't load Whisper."));
});
el.loadDemo.addEventListener("click", () => {
  loadDemo();
  el.aboutDialog.close();
});
el.deleteAll.addEventListener("click", () => {
  if (!window.confirm("Delete every note, section, and demo note saved in this browser? This can't be undone.")) return;
  store.clearAll();
  sections.sections = [DEFAULT_SECTION];
  sections.selected = DEFAULT_SECTION;
  for (const id of [...audioById.keys()]) forgetAudio(id);
  ui.selected = "new";
  mounted = { view: null, key: null };
  el.aboutDialog.close();
  announce("All notes deleted.");
  render();
});

el.addSection.addEventListener("click", () => {
  el.sectionName.value = "";
  el.sectionError.hidden = true;
  el.sectionDialog.showModal();
});
el.sectionCancel.addEventListener("click", () => el.sectionDialog.close());
el.sectionForm.addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  if (!sections.add(el.sectionName.value)) {
    event.preventDefault();
    el.sectionError.hidden = false;
    el.sectionName.focus();
    return;
  }
  ui.tag = null;
  mounted = mounted.view === "new" && !isRecordingActive() ? { view: null, key: null } : mounted;
  announce(`Section ${sections.selected} added.`);
  render();
});

render();
