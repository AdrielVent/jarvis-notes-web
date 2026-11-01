// Rule-based drafting that runs entirely in the browser. It only rearranges sentences the speaker
// actually said; it never adds facts, so every line in the draft can be traced back to the transcript.

const FILLERS = /\b(?:um+|uh+|erm|you know|i mean|kind of|sort of|basically)\b,?\s*|\blike,\s*/gi;
const LEADING_FILLER = /^(?:so|okay|ok|alright|all right|well|and|but|anyway|yeah)[,\s]+/i;

const ACTION_CUE = /\b(?:need(?:s)? to|have to|has to|got to|should|must|will|we'll|i'll|going to|gonna|remember to|follow up|follow-up|todo|to-do|action item|next step|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|next week|end of (?:day|week)))\b/i;
const ACTION_PREFIX = /^(?:(?:i|we|you|they|he|she)\s+(?:really\s+)?(?:need(?:s)? to|have to|has to|got to|should|must|will|'ll|am going to|are going to|is going to|gonna)|(?:i'll|we'll|you'll|they'll)|remember to|next step is to|next step,?|action item,?|todo,?|to-do,?)\s+/i;
const DETAIL_CUE = /\d|%|\$|\b(?:because|so that|decided|agreed|found|showed|result|budget|deadline|risk|issue|problem|tested|measured)\b/i;

const NOT_TAGS = new Set(["OK", "AM", "PM", "TV", "ID", "US", "UK", "ASAP", "FYI", "TBD"]);

const MAX_KEY_POINTS = 5;
const MAX_ACTIONS = 6;
const TITLE_WORDS = 7;

export function cleanTranscript(text) {
  return text
    .replace(FILLERS, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function splitSentences(text) {
  const cleaned = cleanTranscript(text);
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  return parts
    .map((part) => part.trim().replace(/^[,;:\s]+/, "").replace(LEADING_FILLER, ""))
    .map((part) => capitalize(part))
    .filter((part) => part.split(/\s+/).length >= 3);
}

function capitalize(text) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function stripTerminal(text) {
  return text.replace(/[.!?]+["')\]]*$/, "");
}

export function draftTitle(sentences, fallback) {
  if (sentences.length === 0) return fallback;
  const words = stripTerminal(sentences[0]).replace(/[,;:]+$/, "").split(/\s+/);
  const title = words.slice(0, TITLE_WORDS).join(" ").replace(/[,;:]+$/, "");
  return words.length > TITLE_WORDS ? `${title}…` : title;
}

export function toActionItem(sentence) {
  const action = stripTerminal(sentence).replace(ACTION_PREFIX, "").trim();
  return capitalize(action);
}

/** Spoken #hashtags become tags, and so do acronyms such as SHPE or CAD once they come up twice. */
export function detectTags(text) {
  const tags = new Set();
  const counts = new Map();
  for (const match of text.matchAll(/\b[A-Z][A-Z0-9]{1,5}\b/g)) {
    if (NOT_TAGS.has(match[0])) continue;
    const count = (counts.get(match[0]) ?? 0) + 1;
    counts.set(match[0], count);
    if (count === 2) tags.add(match[0]);
  }
  for (const match of text.matchAll(/#([\p{L}\p{N}_-]{2,24})/gu)) {
    tags.add(match[1]);
  }
  return [...tags];
}

export function organize(transcript, { fallbackTitle = "Untitled voice log", existingTags = [] } = {}) {
  const sentences = splitSentences(transcript);
  const actionItems = [];
  const details = [];
  for (const sentence of sentences) {
    if (ACTION_CUE.test(sentence) && actionItems.length < MAX_ACTIONS) {
      actionItems.push({ text: toActionItem(sentence), done: false });
    } else {
      details.push(sentence);
    }
  }

  const summarySentences = sentences.slice(0, 2);
  const keyPoints = details
    .filter((sentence) => !summarySentences.includes(sentence))
    .sort((a, b) => Number(DETAIL_CUE.test(b)) - Number(DETAIL_CUE.test(a)))
    .slice(0, MAX_KEY_POINTS);

  const tags = [...new Set([...existingTags, ...detectTags(transcript)])];

  return {
    title: draftTitle(sentences, fallbackTitle),
    summary: summarySentences.join(" "),
    keyPoints,
    actionItems,
    tags,
  };
}
