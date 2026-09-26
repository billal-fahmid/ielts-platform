import { db } from "@/lib/db";
import { teachers, testimonials, blogPosts, users, courses, lessons } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { memo } from "@/lib/cache";

export function listTeachers() {
  return db.select().from(teachers).all();
}
export function listTestimonials() {
  return db.select().from(testimonials).all();
}
export function listBlogPosts() {
  return db.select().from(blogPosts).where(eq(blogPosts.published, true)).all().sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}
export function getBlogPostBySlug(slug: string) {
  const post = db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).get();
  // Drafts are only in the admin panel.
  return post && post.published ? post : undefined;
}

/** Real numbers for the home and about pages, cached for a few minutes. Nothing here is estimated or made up. */
export function publicStats() {
  return memo("public-stats", 5 * 60_000, () => {
    const count = (t: any, where?: any) => (where ? db.select({ n: sql<number>`count(*)` }).from(t).where(where).get()!.n : db.select({ n: sql<number>`count(*)` }).from(t).get()!.n);
    return {
      students: count(users, eq(users.role, "STUDENT")),
      courses: count(courses, eq(courses.published, true)),
      lessons: count(lessons),
      teachers: count(teachers),
    };
  });
}
