import { db } from "@/lib/db";
import { communityBans, communityCategories, communityComments, communityLikes, communityPosts, communityReports, users } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { AUTO_HIDE_REPORTS, cleanTags, commentProblem, displayName, looksLikeSpam, POST_KINDS, postProblem, REPORT_REASONS, ROLE_BADGES, type PostKind, type ReportReason, type Sort } from "@/lib/community/rules";

export type Post = typeof communityPosts.$inferSelect;
export type Comment = typeof communityComments.$inferSelect;
export type Viewer = { id: string; role: string };

const isModerator = (v: Viewer) => v.role === "ADMIN";
const MAX_POSTS_PER_HOUR = 5;
const MAX_COMMENTS_PER_MINUTE = 6;
const PAGE_SIZE = 15;

const getPostRow = (id: string) => db.select().from(communityPosts).where(eq(communityPosts.id, id)).get();
const getCommentRow = (id: string) => db.select().from(communityComments).where(eq(communityComments.id, id)).get();

function authorMap(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; badge: string | null; role: string }>();
  return new Map(
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(inArray(users.id, [...new Set(ids)]))
      .all()
      .map((u) => [u.id, { name: displayName(u.name, u.role), badge: ROLE_BADGES[u.role] ?? null, role: u.role }])
  );
}

// ---------- Bans ----------

export const isBanned = (userId: string) => !!db.select().from(communityBans).where(eq(communityBans.userId, userId)).get();

function assertMayPost(userId: string) {
  if (isBanned(userId)) throw new TeachingError("You can read the community, but you can't post or comment right now. Contact support if you think this is a mistake.", 403);
}

// ---------- Posts ----------

export type PostInput = { kind: string; title: string; body: string; categoryId?: string | null; tags?: unknown };

/** Categories in the admin's order. New posts can only use active ones. */
export function listCategories(opts: { activeOnly?: boolean } = {}) {
  return db.select().from(communityCategories).all().filter((c) => !opts.activeOnly || c.active).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}


export function createPost(authorId: string, input: PostInput, now = new Date()): Post {
  assertMayPost(authorId);
  if (!(POST_KINDS as readonly string[]).includes(input.kind)) throw new TeachingError("Choose whether this is a discussion or a question.");
  const title = cleanText(input.title ?? "");
  const body = cleanText(input.body ?? "");
  const problem = postProblem(title, body);
  if (problem) throw new TeachingError(problem);
  if (looksLikeSpam(title + " " + body)) throw new TeachingError("That looks like spam. Please write it in your own words.");
  const { tags, error } = cleanTags(input.tags);
  if (error) throw new TeachingError(error);
  const category = input.categoryId ? db.select().from(communityCategories).where(eq(communityCategories.id, input.categoryId)).get() : null;
  if (!category || !category.active) throw new TeachingError("Choose a category for your post.");

  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  const mine = db.select().from(communityPosts).where(eq(communityPosts.authorId, authorId)).all();
  if (mine.filter((p) => p.createdAt.replace(" ", "T") + "Z" >= hourAgo || p.createdAt >= hourAgo).length >= MAX_POSTS_PER_HOUR) throw new TeachingError("You're posting very quickly. Please wait a little before your next post.", 429);
  if (mine.some((p) => p.title === title && p.body === body)) throw new TeachingError("You already posted this.");

  const id = newId();
  db.insert(communityPosts).values({ id, authorId, kind: input.kind as PostKind, title, body, categoryId: category.id, tags }).run();
  return getPostRow(id)!;
}

export type FeedQuery = { kind?: string; tag?: string; category?: string; q?: string; sort?: Sort; page?: number; mine?: string };

/** The feed. Hidden posts are left out (moderators see them in the moderation queue instead). */
export function listPosts(viewer: Viewer, query: FeedQuery = {}) {
  const conditions = [eq(communityPosts.status, "PUBLISHED")];
  if (query.kind && (POST_KINDS as readonly string[]).includes(query.kind)) conditions.push(eq(communityPosts.kind, query.kind as PostKind));
  if (query.mine) conditions.push(eq(communityPosts.authorId, query.mine));
  if (query.category) {
    const cat = db.select().from(communityCategories).where(eq(communityCategories.slug, query.category)).get();
    conditions.push(eq(communityPosts.categoryId, cat?.id ?? "none"));
  }
  const q = query.q?.trim().toLowerCase();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    conditions.push(or(sql`lower(${communityPosts.title}) like ${pattern} escape '\\'`, sql`lower(${communityPosts.body}) like ${pattern} escape '\\'`)!);
  }
  const tag = query.tag?.trim().toLowerCase();
  if (tag) conditions.push(like(communityPosts.tags, `%"${tag.replace(/[%_"\\]/g, "")}"%`));

  const rows = db.select().from(communityPosts).where(and(...conditions)).all();
  const ids = rows.map((r) => r.id);
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const liked = new Set<string>();
  if (ids.length) {
    for (const r of db.select({ id: communityLikes.targetId, n: sql<number>`count(*)` }).from(communityLikes).where(and(eq(communityLikes.targetType, "POST"), inArray(communityLikes.targetId, ids))).groupBy(communityLikes.targetId).all()) likeCounts.set(r.id, r.n);
    for (const r of db.select({ id: communityComments.postId, n: sql<number>`count(*)` }).from(communityComments).where(and(eq(communityComments.status, "PUBLISHED"), inArray(communityComments.postId, ids))).groupBy(communityComments.postId).all()) commentCounts.set(r.id, r.n);
    for (const r of db.select({ id: communityLikes.targetId }).from(communityLikes).where(and(eq(communityLikes.userId, viewer.id), eq(communityLikes.targetType, "POST"), inArray(communityLikes.targetId, ids))).all()) liked.add(r.id);
  }

  let list = rows.map((p) => ({ post: p, likes: likeCounts.get(p.id) ?? 0, comments: commentCounts.get(p.id) ?? 0, liked: liked.has(p.id), answered: !!p.acceptedCommentId }));
  const sort: Sort = query.sort ?? "latest";
  if (sort === "unanswered") list = list.filter((r) => r.post.kind === "QUESTION" && !r.answered);
  list.sort((a, b) => {
    if (a.post.pinned !== b.post.pinned) return a.post.pinned ? -1 : 1;
    if (sort === "top" && b.likes !== a.likes) return b.likes - a.likes;
    return b.post.lastActivityAt.localeCompare(a.post.lastActivityAt);
  });

  const total = list.length;
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const authors = authorMap(slice.map((r) => r.post.authorId));
  const cats = new Map(listCategories().map((c) => [c.id, c]));
  return { total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), items: slice.map((r) => ({ ...r, category: r.post.categoryId ? (cats.get(r.post.categoryId) ?? null) : null, author: authors.get(r.post.authorId) ?? { name: "Former member", badge: null, role: "STUDENT" } })) };
}

/** Popular tags across published posts, for the filter chips. */
export function popularTags(limit = 12): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of db.select({ tags: communityPosts.tags }).from(communityPosts).where(eq(communityPosts.status, "PUBLISHED")).all()) for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, limit);
}

/** A post with its comments. A hidden post is visible only to its author (with a notice) and to moderators. */
export function getPostView(viewer: Viewer, postId: string) {
  const post = getPostRow(postId);
  if (!post) return null;
  if (post.status === "HIDDEN" && post.authorId !== viewer.id && !isModerator(viewer)) return null;
  const comments = db.select().from(communityComments).where(eq(communityComments.postId, postId)).orderBy(communityComments.createdAt).all().filter((c) => c.status === "PUBLISHED" || isModerator(viewer) || c.authorId === viewer.id);
  const authors = authorMap([post.authorId, ...comments.map((c) => c.authorId)]);
  const commentIds = comments.map((c) => c.id);
  const likeCount = (type: "POST" | "COMMENT", ids: string[]) =>
    new Map(ids.length ? db.select({ id: communityLikes.targetId, n: sql<number>`count(*)` }).from(communityLikes).where(and(eq(communityLikes.targetType, type), inArray(communityLikes.targetId, ids))).groupBy(communityLikes.targetId).all().map((r) => [r.id, r.n]) : []);
  const postLikes = likeCount("POST", [postId]);
  const commentLikes = likeCount("COMMENT", commentIds);
  const mine = new Set(db.select().from(communityLikes).where(eq(communityLikes.userId, viewer.id)).all().filter((l) => (l.targetType === "POST" && l.targetId === postId) || (l.targetType === "COMMENT" && commentIds.includes(l.targetId))).map((l) => l.targetType + ":" + l.targetId));
  const reported = new Set(db.select().from(communityReports).where(eq(communityReports.reporterId, viewer.id)).all().map((r) => r.targetType + ":" + r.targetId));
  const unknown = { name: "Former member", badge: null, role: "STUDENT" };
  return {
    post,
    category: post.categoryId ? (db.select().from(communityCategories).where(eq(communityCategories.id, post.categoryId)).get() ?? null) : null,
    author: authors.get(post.authorId) ?? unknown,
    likes: postLikes.get(postId) ?? 0,
    liked: mine.has("POST:" + postId),
    reported: reported.has("POST:" + postId),
    mayAccept: post.kind === "QUESTION" && (post.authorId === viewer.id || viewer.role === "TEACHER" || viewer.role === "ADMIN"),
    comments: comments.map((c) => ({ comment: c, author: authors.get(c.authorId) ?? unknown, likes: commentLikes.get(c.id) ?? 0, liked: mine.has("COMMENT:" + c.id), reported: reported.has("COMMENT:" + c.id), accepted: post.acceptedCommentId === c.id })),
  };
}

export function deletePost(actor: Viewer, postId: string) {
  const post = getPostRow(postId);
  if (!post) throw new TeachingError("That post doesn't exist.", 404);
  if (post.authorId !== actor.id && !isModerator(actor)) throw new TeachingError("You can only delete your own posts.", 403);
  const commentIds = db.select({ id: communityComments.id }).from(communityComments).where(eq(communityComments.postId, postId)).all().map((c) => c.id);
  if (commentIds.length) {
    db.delete(communityLikes).where(and(eq(communityLikes.targetType, "COMMENT"), inArray(communityLikes.targetId, commentIds))).run();
    db.delete(communityReports).where(and(eq(communityReports.targetType, "COMMENT"), inArray(communityReports.targetId, commentIds))).run();
    db.delete(communityComments).where(eq(communityComments.postId, postId)).run();
  }
  db.delete(communityLikes).where(and(eq(communityLikes.targetType, "POST"), eq(communityLikes.targetId, postId))).run();
  db.delete(communityReports).where(and(eq(communityReports.targetType, "POST"), eq(communityReports.targetId, postId))).run();
  db.delete(communityPosts).where(eq(communityPosts.id, postId)).run();
}

// ---------- Comments ----------

export function addComment(authorId: string, postId: string, body: string, now = new Date()): Comment {
  assertMayPost(authorId);
  const post = getPostRow(postId);
  if (!post || post.status !== "PUBLISHED") throw new TeachingError("That post isn't available.", 404);
  const text = cleanText(body ?? "");
  const problem = commentProblem(text);
  if (problem) throw new TeachingError(problem);
  if (looksLikeSpam(text)) throw new TeachingError("That looks like spam. Please write it in your own words.");
  const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const recent = db.select().from(communityComments).where(eq(communityComments.authorId, authorId)).all().filter((c) => c.createdAt.replace(" ", "T") + "Z" >= minuteAgo || c.createdAt >= minuteAgo);
  if (recent.length >= MAX_COMMENTS_PER_MINUTE) throw new TeachingError("You're commenting very quickly. Please slow down a little.", 429);
  if (recent.some((c) => c.postId === postId && c.body === text)) throw new TeachingError("You already posted that comment.");

  const id = newId();
  db.insert(communityComments).values({ id, postId, authorId, body: text }).run();
  db.update(communityPosts).set({ lastActivityAt: now.toISOString() }).where(eq(communityPosts.id, postId)).run();
  if (post.authorId !== authorId) {
    const who = authorMap([authorId]).get(authorId)?.name ?? "Someone";
    notify(post.authorId, { type: "COMMUNITY", title: `${who} replied to “${post.title.slice(0, 60)}”`, body: text.slice(0, 140), url: `/dashboard/community/${postId}` });
  }
  return getCommentRow(id)!;
}

export function deleteComment(actor: Viewer, commentId: string) {
  const c = getCommentRow(commentId);
  if (!c) throw new TeachingError("That comment doesn't exist.", 404);
  if (c.authorId !== actor.id && !isModerator(actor)) throw new TeachingError("You can only delete your own comments.", 403);
  db.update(communityPosts).set({ acceptedCommentId: null }).where(and(eq(communityPosts.id, c.postId), eq(communityPosts.acceptedCommentId, commentId))).run();
  db.delete(communityLikes).where(and(eq(communityLikes.targetType, "COMMENT"), eq(communityLikes.targetId, commentId))).run();
  db.delete(communityReports).where(and(eq(communityReports.targetType, "COMMENT"), eq(communityReports.targetId, commentId))).run();
  db.delete(communityComments).where(eq(communityComments.id, commentId)).run();
}

/** Marks a comment as the accepted answer to a question (or clears it with null). The asker, teachers and moderators can. */
export function acceptAnswer(actor: Viewer, postId: string, commentId: string | null) {
  const post = getPostRow(postId);
  if (!post || post.status !== "PUBLISHED") throw new TeachingError("That post isn't available.", 404);
  if (post.kind !== "QUESTION") throw new TeachingError("Only questions can have an accepted answer.");
  if (post.authorId !== actor.id && actor.role !== "TEACHER" && actor.role !== "ADMIN") throw new TeachingError("Only the person who asked, or a teacher, can choose the answer.", 403);
  if (commentId === null) {
    db.update(communityPosts).set({ acceptedCommentId: null }).where(eq(communityPosts.id, postId)).run();
    return;
  }
  const c = getCommentRow(commentId);
  if (!c || c.postId !== postId || c.status !== "PUBLISHED") throw new TeachingError("That comment isn't part of this question.");
  db.update(communityPosts).set({ acceptedCommentId: commentId }).where(eq(communityPosts.id, postId)).run();
  if (c.authorId !== actor.id) notify(c.authorId, { type: "COMMUNITY", title: "Your answer was accepted", body: `It helped with “${post.title.slice(0, 80)}”.`, url: `/dashboard/community/${postId}` });
}

// ---------- Likes ----------

/** Likes or un-likes. You can't like your own posts and comments, so likes mean something. */
export function toggleLike(userId: string, targetType: "POST" | "COMMENT", targetId: string): { liked: boolean; count: number } {
  assertMayPost(userId);
  const target = targetType === "POST" ? getPostRow(targetId) : getCommentRow(targetId);
  if (!target || target.status !== "PUBLISHED") throw new TeachingError("That isn't available.", 404);
  if (target.authorId === userId) throw new TeachingError("You can't like your own post.");
  const existing = db.select().from(communityLikes).where(and(eq(communityLikes.userId, userId), eq(communityLikes.targetType, targetType), eq(communityLikes.targetId, targetId))).get();
  if (existing) db.delete(communityLikes).where(eq(communityLikes.id, existing.id)).run();
  else db.insert(communityLikes).values({ id: newId(), userId, targetType, targetId }).onConflictDoNothing().run();
  const count = db.select().from(communityLikes).where(and(eq(communityLikes.targetType, targetType), eq(communityLikes.targetId, targetId))).all().length;
  return { liked: !existing, count };
}

// ---------- Reports and moderation ----------

/** Reports content. Several different people reporting the same thing hides it until a moderator decides. */
export function reportContent(reporterId: string, targetType: "POST" | "COMMENT", targetId: string, reason: string, details?: string | null): { autoHidden: boolean } {
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) throw new TeachingError("Choose a reason for the report.");
  const target = targetType === "POST" ? getPostRow(targetId) : getCommentRow(targetId);
  if (!target) throw new TeachingError("That isn't available.", 404);
  if (target.authorId === reporterId) throw new TeachingError("You can't report your own post. You can delete it instead.");
  const existing = db.select().from(communityReports).where(and(eq(communityReports.reporterId, reporterId), eq(communityReports.targetType, targetType), eq(communityReports.targetId, targetId))).get();
  if (existing) throw new TeachingError("You've already reported this. A moderator will look at it.");
  db.insert(communityReports).values({ id: newId(), reporterId, targetType, targetId, reason: reason as ReportReason, details: details ? cleanText(details).slice(0, 500) || null : null }).run();

  const open = db.select().from(communityReports).where(and(eq(communityReports.targetType, targetType), eq(communityReports.targetId, targetId), eq(communityReports.status, "OPEN"))).all();
  const distinct = new Set(open.map((r) => r.reporterId)).size;
  let autoHidden = false;
  if (distinct >= AUTO_HIDE_REPORTS && target.status === "PUBLISHED") {
    setStatus(targetType, targetId, "HIDDEN");
    autoHidden = true;
    notify(target.authorId, { type: "COMMUNITY", title: "Your post is hidden while a moderator checks it", body: "Several people reported it. A moderator will review it soon.", url: "/dashboard/community" });
  }
  return { autoHidden };
}

function setStatus(targetType: "POST" | "COMMENT", targetId: string, status: "PUBLISHED" | "HIDDEN") {
  if (targetType === "POST") db.update(communityPosts).set({ status }).where(eq(communityPosts.id, targetId)).run();
  else db.update(communityComments).set({ status }).where(eq(communityComments.id, targetId)).run();
}

function requireAdmin(actor: Viewer) {
  if (actor.role !== "ADMIN") throw new TeachingError("Only moderators can do that.", 403);
}

export function listReports(actor: Viewer, status: "OPEN" | "ACTIONED" | "DISMISSED" = "OPEN") {
  requireAdmin(actor);
  const rows = db.select().from(communityReports).where(eq(communityReports.status, status)).orderBy(desc(communityReports.createdAt)).all();
  // One entry per piece of content, with every report about it.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.targetType + ":" + r.targetId, [...(groups.get(r.targetType + ":" + r.targetId) ?? []), r]);
  const out = [...groups.entries()].map(([key, reports]) => {
    const [targetType, targetId] = key.split(":") as ["POST" | "COMMENT", string];
    const target = targetType === "POST" ? getPostRow(targetId) : getCommentRow(targetId);
    const post = targetType === "POST" ? (target as Post | undefined) : target ? getPostRow((target as Comment).postId) : undefined;
    const author = target ? authorMap([target.authorId]).get(target.authorId) : undefined;
    const reporters = authorMap(reports.map((r) => r.reporterId));
    return {
      key,
      targetType,
      targetId,
      postId: post?.id ?? null,
      postTitle: post?.title ?? null,
      text: target ? (targetType === "POST" ? `${(target as Post).title}\n${(target as Post).body}` : (target as Comment).body) : null,
      hidden: target?.status === "HIDDEN",
      authorId: target?.authorId ?? null,
      authorName: author?.name ?? "Former member",
      banned: target ? isBanned(target.authorId) : false,
      reports: reports.map((r) => ({ id: r.id, reason: r.reason, details: r.details, reporter: reporters.get(r.reporterId)?.name ?? "Someone", createdAt: r.createdAt })),
    };
  });
  return out;
}

/** A moderator's decision on one piece of reported content. */
export function resolveReports(actor: Viewer, targetType: "POST" | "COMMENT", targetId: string, action: "HIDE" | "RESTORE" | "DISMISS" | "DELETE") {
  requireAdmin(actor);
  const target = targetType === "POST" ? getPostRow(targetId) : getCommentRow(targetId);
  const now = new Date().toISOString();
  const closeOpen = (status: "ACTIONED" | "DISMISSED") =>
    db.update(communityReports).set({ status, resolvedBy: actor.id, resolvedAt: now }).where(and(eq(communityReports.targetType, targetType), eq(communityReports.targetId, targetId), eq(communityReports.status, "OPEN"))).run();
  if (!target) {
    closeOpen("DISMISSED");
    return;
  }
  if (action === "DELETE") {
    closeOpen("ACTIONED");
    if (targetType === "POST") deletePost(actor, targetId);
    else deleteComment(actor, targetId);
    notify(target.authorId, { type: "COMMUNITY", title: "A moderator removed your post", body: "It broke the community rules.", url: "/dashboard/community" });
    return;
  }
  if (action === "HIDE") {
    setStatus(targetType, targetId, "HIDDEN");
    closeOpen("ACTIONED");
    notify(target.authorId, { type: "COMMUNITY", title: "A moderator hid your post", body: "It broke the community rules. You can delete it.", url: "/dashboard/community" });
    return;
  }
  // RESTORE and DISMISS both put the content back and close the reports, as no action was needed.
  if (target.status === "HIDDEN") setStatus(targetType, targetId, "PUBLISHED");
  closeOpen("DISMISSED");
}

export function setPinned(actor: Viewer, postId: string, pinned: boolean) {
  requireAdmin(actor);
  if (!getPostRow(postId)) throw new TeachingError("That post doesn't exist.", 404);
  db.update(communityPosts).set({ pinned }).where(eq(communityPosts.id, postId)).run();
}

export function banUser(actor: Viewer, userId: string, reason?: string | null) {
  requireAdmin(actor);
  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) throw new TeachingError("That account doesn't exist.", 404);
  if (target.role !== "STUDENT") throw new TeachingError("Only students can be restricted here.");
  db.insert(communityBans).values({ userId, reason: reason ? cleanText(reason).slice(0, 300) || null : null, bannedBy: actor.id }).onConflictDoNothing().run();
  notify(userId, { type: "COMMUNITY", title: "Your community access was restricted", body: "You can still read the community but can't post, comment or host rooms.", url: "/dashboard/community" });
}

export function unbanUser(actor: Viewer, userId: string) {
  requireAdmin(actor);
  db.delete(communityBans).where(eq(communityBans.userId, userId)).run();
}

export function listBans(actor: Viewer) {
  requireAdmin(actor);
  const bans = db.select().from(communityBans).orderBy(desc(communityBans.createdAt)).all();
  const names = new Map(db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, bans.map((b) => b.userId).length ? bans.map((b) => b.userId) : [""])).all().map((u) => [u.id, u]));
  return bans.map((b) => ({ ...b, name: names.get(b.userId)?.name ?? "Former member", email: names.get(b.userId)?.email ?? "" }));
}

/** Everything hidden right now, for moderators to review or restore. */
export function listHidden(actor: Viewer) {
  requireAdmin(actor);
  const posts = db.select().from(communityPosts).where(eq(communityPosts.status, "HIDDEN")).all().map((p) => ({ targetType: "POST" as const, id: p.id, postId: p.id, text: `${p.title}\n${p.body}`, authorName: authorMap([p.authorId]).get(p.authorId)?.name ?? "Former member" }));
  const comments = db.select().from(communityComments).where(eq(communityComments.status, "HIDDEN")).all().map((c) => ({ targetType: "COMMENT" as const, id: c.id, postId: c.postId, text: c.body, authorName: authorMap([c.authorId]).get(c.authorId)?.name ?? "Former member" }));
  return [...posts, ...comments];
}

export const openReportCount = () => new Set(db.select().from(communityReports).where(eq(communityReports.status, "OPEN")).all().map((r) => r.targetType + ":" + r.targetId)).size;

/** Posts and answers by a member, for a profile-style summary. */
export function memberStats(userId: string) {
  return {
    posts: db.select().from(communityPosts).where(and(eq(communityPosts.authorId, userId), eq(communityPosts.status, "PUBLISHED"))).all().length,
    comments: db.select().from(communityComments).where(and(eq(communityComments.authorId, userId), eq(communityComments.status, "PUBLISHED"))).all().length,
  };
}

// keep `gte` referenced for future date filters
void gte;
