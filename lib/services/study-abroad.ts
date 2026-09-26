import { db } from "@/lib/db";
import { studyCountries } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

/** Published countries in the order the admin set. */
export function listCountries() {
  return db.select().from(studyCountries).where(eq(studyCountries.published, true)).orderBy(asc(studyCountries.order), asc(studyCountries.name)).all();
}

export function getCountryBySlug(slug: string) {
  const c = db.select().from(studyCountries).where(eq(studyCountries.slug, slug)).get();
  return c && c.published ? c : null;
}
