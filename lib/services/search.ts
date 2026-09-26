import { db } from "@/lib/db";
import { blogPosts, communityCategories, communityPosts, courses, grammarTopics, ieltsQuestions, learningResources, lessons, listeningSections, modules, readingPassages, studyCountries, teachers, vocabulary } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listPlans } from "@/lib/services/plans";

export const SEARCH_TYPES = ["COURSE", "LESSON", "BLOG", "COUNTRY", "RESOURCE", "TEACHER", "VOCABULARY", "IELTSQ", "GRAMMAR", "COMMUNITY"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  COURSE: "Courses",
  LESSON: "Lessons",
  BLOG: "Blog",
  COUNTRY: "Study abroad",
  RESOURCE: "Resources",
  TEACHER: "Teachers",
  VOCABULARY: "Vocabulary",
  IELTSQ: "IELTS questions",
  GRAMMAR: "Grammar",
  COMMUNITY: "Community",
};

/** Types anyone can search. The others need a signed-in member. */
export const PUBLIC_SEARCH_TYPES: SearchType[] = ["COURSE", "BLOG", "COUNTRY", "RESOURCE", "TEACHER"];
export const TRACKS = ["ENGLISH", "IELTS", "CAREER"] as const;

export type SearchViewer = { id: string; role: string } | null;
export type SearchResult = { type: SearchType; id: string; title: string; snippet: string; url: string; meta: string; score: number };

export const MIN_TERM_LENGTH = 2;
export const MAX_TERMS = 6;
const PAGE_SIZE = 12;

/** Splits what someone typed into lower-case words. Very short words are dropped, and so is anything past the sixth word. */
export function parseTerms(q: string | null | undefined): string[] {
  const words = (q ?? "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, " ").split(/\s+/).map((w) => w.replace(/^['-]+|['-]+$/g, "")).filter((w) => w.length >= MIN_TERM_LENGTH);
  return [...new Set(words)].slice(0, MAX_TERMS);
}

const flat = (text: string | null | undefined) => (text ?? "").replace(/[#*_`>]+/g, " ").replace(/\s+/g, " ").trim();

/** A short piece of text around the first place a search word appears, so people see why it matched. */
export function makeSnippet(text: string, terms: string[], length = 160): string {
  const t = flat(text);
  if (!t) return "";
  const lower = t.toLowerCase();
  const first = terms.map((w) => lower.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (first === undefined || t.length <= length) return t.slice(0, length) + (t.length > length ? "…" : "");
  const start = Math.max(0, first - 40);
  return (start > 0 ? "…" : "") + t.slice(start, start + length) + (start + length < t.length ? "…" : "");
}

/** Every word must appear somewhere in the title or body. The score favours title matches, and an exact title most of all. */
export function scoreMatch(title: string, body: string, terms: string[]): number {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  let score = 0;
  for (const w of terms) {
    const inTitle = t.includes(w);
    const inBody = b.includes(w);
    if (!inTitle && !inBody) return 0;
    if (inTitle) score += t.startsWith(w) ? 5 : 3;
    if (inBody) score += 1;
  }
  if (t === terms.join(" ")) score += 5;
  return score;
}

type Candidate = { type: SearchType; id: string; title: string; body: string; url: string; meta: string; track?: string };

function candidates(viewer: SearchViewer): Candidate[] {
  const out: Candidate[] = [];
  const planNames = new Map(listPlans().map((p) => [p.code, p.name]));

  const publishedCourses = db.select().from(courses).where(eq(courses.published, true)).all();
  for (const c of publishedCourses) out.push({ type: "COURSE", id: c.id, title: c.title, body: c.description, url: `/courses/${c.slug}`, meta: `${c.track === "IELTS" ? "IELTS" : c.track === "CAREER" ? "English for Career" : "English"} · ${c.category.charAt(0) + c.category.slice(1).toLowerCase()}`, track: c.track });
  for (const p of db.select().from(blogPosts).where(eq(blogPosts.published, true)).all()) out.push({ type: "BLOG", id: p.id, title: p.title, body: [p.excerpt, p.content, ...(p.tags ?? [])].join(" "), url: `/blog/${p.slug}`, meta: p.category });
  for (const c of db.select().from(studyCountries).where(eq(studyCountries.published, true)).all()) out.push({ type: "COUNTRY", id: c.id, title: c.name, body: [c.summary, c.ieltsRequirement, c.visaInfo, c.workRights, ...(c.popularCities ?? []), ...(c.scholarships ?? [])].join(" "), url: `/study-abroad/${c.slug}`, meta: c.ieltsRequirement ? `IELTS: ${c.ieltsRequirement}` : "Study abroad guide" });
  for (const r of db.select().from(learningResources).where(eq(learningResources.published, true)).all()) out.push({ type: "RESOURCE", id: r.id, title: r.title, body: r.description, url: `/resources?category=${encodeURIComponent(r.category)}`, meta: `${r.category}${r.requiredPlan !== "FREE" ? ` · ${planNames.get(r.requiredPlan) ?? r.requiredPlan} plan` : " · Free"}` });
  for (const t of db.select().from(teachers).all()) out.push({ type: "TEACHER", id: t.id, title: t.name, body: [t.title, t.bio, ...(t.specialties ?? [])].join(" "), url: "/teachers", meta: t.title });

  if (viewer) {
    const bySlug = new Map(publishedCourses.map((c) => [c.id, c]));
    const modCourse = new Map(db.select().from(modules).all().map((m) => [m.id, bySlug.get(m.courseId)]));
    for (const l of db.select().from(lessons).all()) {
      const c = modCourse.get(l.moduleId);
      if (c) out.push({ type: "LESSON", id: l.id, title: l.title, body: [l.description, l.content].join(" "), url: `/dashboard/courses/${c.slug}/${l.slug}`, meta: c.title, track: c.track });
    }
    for (const v of db.select().from(vocabulary).all()) out.push({ type: "VOCABULARY", id: v.id, title: v.word, body: [v.meaning, v.banglaMeaning, v.example, v.synonym].join(" "), url: "/dashboard/vocabulary", meta: `${v.category.charAt(0) + v.category.slice(1).toLowerCase()} · ${v.difficulty.toLowerCase()}` });
    for (const g of db.select().from(grammarTopics).all()) out.push({ type: "GRAMMAR", id: g.id, title: g.title, body: [g.description, g.explanation].join(" "), url: `/dashboard/grammar/${g.slug}`, meta: "Grammar Lab" });
    // IELTS questions: only published ones, found by their wording, topic and tags. Answers and explanations are never searched, so search cannot be used to look up answers.
    const passages = new Map(db.select().from(readingPassages).where(eq(readingPassages.published, true)).all().map((p) => [p.id, p]));
    const sectionTest = new Map(db.select().from(listeningSections).all().map((s) => [s.id, s.listeningTestId]));
    for (const q of db.select().from(ieltsQuestions).where(eq(ieltsQuestions.published, true)).all()) {
      const passage = q.passageId ? passages.get(q.passageId) : null;
      const testId = q.listeningSectionId ? sectionTest.get(q.listeningSectionId) : null;
      const url = passage ? `/dashboard/ielts/reading/${passage.id}` : testId ? `/dashboard/ielts/listening/${testId}` : null;
      if (!url) continue;
      out.push({ type: "IELTSQ", id: q.id, title: q.prompt.length > 90 ? q.prompt.slice(0, 89) + "…" : q.prompt, body: [q.prompt, q.topic, ...(q.tags ?? [])].join(" "), url, meta: `${q.skill === "READING" ? "Reading" : "Listening"} · ${q.questionType.replace(/_/g, " ").toLowerCase()} · ${q.difficulty.toLowerCase()}` });
    }
    const catNames = new Map(db.select().from(communityCategories).all().map((c) => [c.id, c.name]));
    for (const p of db.select().from(communityPosts).where(eq(communityPosts.status, "PUBLISHED")).all()) out.push({ type: "COMMUNITY", id: p.id, title: p.title, body: [p.body, ...(p.tags ?? [])].join(" "), url: `/dashboard/community/${p.id}`, meta: `${p.kind === "QUESTION" ? "Question" : "Discussion"}${p.categoryId && catNames.get(p.categoryId) ? " · " + catNames.get(p.categoryId) : ""}` });
  }
  return out;
}

export type SearchQuery = { q?: string | null; type?: string | null; track?: string | null; page?: number };

/**
 * Searches courses, lessons, the blog, study-abroad guides, resources and teachers, and (for signed-in members only)
 * vocabulary, grammar and community posts. Returns matches with counts per type for filter chips. Hidden and draft
 * content is never searched, and locked resources appear without their address.
 */
export function search(query: SearchQuery, viewer: SearchViewer = null) {
  const terms = parseTerms(query.q);
  const allowed = new Set<SearchType>(viewer ? SEARCH_TYPES : PUBLIC_SEARCH_TYPES);
  const type = (SEARCH_TYPES as readonly string[]).includes(query.type ?? "") && allowed.has(query.type as SearchType) ? (query.type as SearchType) : null;
  const track = (TRACKS as readonly string[]).includes(query.track ?? "") ? (query.track as string) : null;
  const empty = { terms, type, track, total: 0, counts: {} as Partial<Record<SearchType, number>>, items: [] as SearchResult[], page: 1, pages: 1, pageSize: PAGE_SIZE, allowedTypes: [...allowed] };
  if (terms.length === 0) return empty;

  const matches: SearchResult[] = [];
  for (const c of candidates(viewer)) {
    if (track && c.track && c.track !== track) continue;
    const score = scoreMatch(c.title, c.body, terms);
    if (score > 0) matches.push({ type: c.type, id: c.id, title: c.title, snippet: makeSnippet(c.body, terms), url: c.url, meta: c.meta, score });
  }
  const counts: Partial<Record<SearchType, number>> = {};
  for (const m of matches) counts[m.type] = (counts[m.type] ?? 0) + 1;

  const shown = (type ? matches.filter((m) => m.type === type) : matches).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Math.floor(query.page ?? 1)));
  return { ...empty, total: shown.length, counts, items: shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages };
}
