/**
 * Turns the tutor's formatted replies into short chunks that browsers can read aloud reliably.
 * Pure text logic (no browser APIs) so it can be tested directly.
 *
 * Two problems it solves:
 *  - Replies contain markdown (**bold**, bullets) that a voice would read literally.
 *  - Replies mix English and Bangla, which need different voices; many devices have no Bangla
 *    voice at all, so the two scripts are separated and the caller can skip or route each one.
 */

export type SpeechSegment = { lang: "en" | "bn"; text: string };

const isBangla = (ch: string) => /[ঀ-৿]/.test(ch);
const isLatin = (ch: string) => /[A-Za-z]/.test(ch);
const hasLetters = (s: string) => /[A-Za-zঀ-৿]/.test(s);

/** Removes the markdown the tutor uses and turns line breaks into pauses. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((line) => (/[.!?।:;]$/.test(line) ? line : `${line}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into runs of one script. Digits, punctuation and spaces stay with the run they follow. */
export function splitByScript(text: string): SpeechSegment[] {
  const runs: SpeechSegment[] = [];
  let current: SpeechSegment | null = null;
  let leading = "";

  for (const ch of text) {
    const lang = isBangla(ch) ? "bn" : isLatin(ch) ? "en" : null;
    if (lang === null) {
      if (current) current.text += ch;
      else leading += ch;
      continue;
    }
    if (!current || current.lang !== lang) {
      current = { lang, text: leading };
      leading = "";
      runs.push(current);
    }
    current.text += ch;
  }
  return runs.map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ").trim() })).filter((r) => hasLetters(r.text));
}

/** Packs sentences into chunks of at most `maxLen` characters (long text can make some browsers stop mid-speech). */
export function chunkText(text: string, maxLen = 180): string[] {
  const sentences = text.split(/(?<=[.!?।;:])\s+/).filter(Boolean);
  const pieces: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxLen) {
      pieces.push(sentence);
      continue;
    }
    // A very long sentence: break it at spaces, keeping each piece within the limit.
    let rest = sentence;
    while (rest.length > maxLen) {
      const cut = rest.lastIndexOf(" ", maxLen);
      const at = cut > maxLen / 2 ? cut : maxLen;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
  }

  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + 1 + piece.length <= maxLen) chunks[chunks.length - 1] = `${last} ${piece}`;
    else chunks.push(piece);
  }
  return chunks.filter(hasLetters);
}

export function toSpeechSegments(markdown: string, maxLen = 180): SpeechSegment[] {
  return splitByScript(stripMarkdown(markdown)).flatMap((run) => chunkText(run.text, maxLen).map((text) => ({ lang: run.lang, text })));
}
