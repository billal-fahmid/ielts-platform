import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTeachers } from "@/lib/services/marketing";

export const metadata: Metadata = pageMetadata({ title: "Teachers — BanglaEnglish", description: "Meet the teachers who review your writing, run live classes and coach your speaking.", path: "/teachers" });

export default function TeachersPage() {
  const teachers = listTeachers();

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Teachers</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            Learn from experienced English & IELTS coaches
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            Every course and lesson is built with input from teachers who have coached
            thousands of Bangladeshi students to their target scores.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {teachers.map((t) => (
            <Card key={t.id} className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft font-display text-xl text-primary">
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h2 className="mt-4 font-display text-lg text-ink">{t.name}</h2>
              <p className="text-sm text-ink-soft">{t.title}</p>
              <p className="mt-3 text-sm text-ink-soft">{t.bio}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {t.specialties?.map((s) => (
                  <Badge key={s} tone="primary">{s}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
