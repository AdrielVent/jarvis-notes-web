function parts(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60), s: seconds % 60 };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "5 min, 12 sec" for display; matches the iOS abbreviated unit style. */
export function durationShort(totalSeconds) {
  const { h, m, s } = parts(totalSeconds);
  const out = [];
  if (h) out.push(`${h} hr`);
  if (m) out.push(`${m} min`);
  if (s || out.length === 0) out.push(`${s} sec`);
  return out.join(", ");
}

/** "5 minutes, 12 seconds" for screen readers. */
export function durationSpoken(totalSeconds) {
  const { h, m, s } = parts(totalSeconds);
  const out = [];
  if (h) out.push(plural(h, "hour"));
  if (m) out.push(plural(m, "minute"));
  if (s || out.length === 0) out.push(plural(s, "second"));
  return out.join(", ");
}

/** "00:12" or "1:02:03" for the recorder display. */
export function clock(totalSeconds) {
  const { h, m, s } = parts(totalSeconds);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function dateShort(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function dateLong(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function noteToMarkdown(note) {
  const lines = [`# ${note.title}`, "", `${note.type} · ${dateLong(note.createdAt)}`];
  if (note.durationSeconds) lines[2] += ` · ${durationShort(note.durationSeconds)}`;
  if (note.tags?.length) lines.push("", `Tags: ${note.tags.join(", ")}`);
  if (note.summary) lines.push("", "## Summary", "", note.summary);
  if (note.keyPoints?.length) lines.push("", "## Key points", "", ...note.keyPoints.map((point) => `- ${point}`));
  if (note.actionItems?.length) {
    lines.push("", "## Action items", "", ...note.actionItems.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`));
  }
  if (note.manualNotes) lines.push("", "## My notes", "", note.manualNotes);
  if (note.transcript) lines.push("", "## Transcript", "", note.transcript);
  return `${lines.join("\n")}\n`;
}
