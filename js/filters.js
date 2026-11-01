export const DATE_FILTERS = ["any", "needsFix", "today", "thisWeek", "thisMonth"];

export function dateFilterTitle(filter) {
  switch (filter) {
    case "any": return "Any Date";
    case "needsFix": return "Needs Fix";
    case "today": return "Today";
    case "thisWeek": return "This Week";
    case "thisMonth": return "This Month";
    default: throw new Error(`Unknown date filter: ${filter}`);
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Weeks start on Sunday, matching the iOS app's default Gregorian calendar in the US locale. */
function startOfWeek(date) {
  const day = startOfDay(date);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function matchesDate(note, filter, now = new Date()) {
  const created = new Date(note.createdAt);
  switch (filter) {
    case "any": return true;
    case "needsFix": return note.status === "failed";
    case "today": return created >= startOfDay(now);
    case "thisWeek": return created >= startOfWeek(now);
    case "thisMonth": return created >= startOfMonth(now);
    default: throw new Error(`Unknown date filter: ${filter}`);
  }
}

export function matchesQuery(note, query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const haystack = [
    note.title,
    note.summary,
    note.transcript,
    note.manualNotes,
    note.type,
    ...(note.tags ?? []),
    ...(note.keyPoints ?? []),
    ...(note.actionItems ?? []).map((item) => item.text),
  ];
  return haystack.some((field) => typeof field === "string" && field.toLocaleLowerCase().includes(needle));
}

export function filterNotes(notes, { section, query = "", dateFilter = "any", tag = null }, now = new Date()) {
  return notes
    .filter((note) => note.section === section)
    .filter((note) => tag === null || (note.tags ?? []).includes(tag))
    .filter((note) => matchesDate(note, dateFilter, now))
    .filter((note) => matchesQuery(note, query))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function availableTags(notes, section) {
  const tags = new Set();
  for (const note of notes) {
    if (note.section !== section) continue;
    for (const tag of note.tags ?? []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function hasActiveFilters({ query = "", dateFilter = "any", tag = null }) {
  return query.trim() !== "" || dateFilter !== "any" || tag !== null;
}
