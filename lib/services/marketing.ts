import { db } from "@/lib/db";
import { teachers, testimonials, blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function listTeachers() {
  return db.select().from(teachers).all();
}
export function listTestimonials() {
  return db.select().from(testimonials).all();
}
export function listBlogPosts() {
  return db.select().from(blogPosts).all().sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}
export function getBlogPostBySlug(slug: string) {
  return db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).get();
}
