import Link from "next/link";
import { GraduationCap, Link2, PlayCircle, Camera } from "lucide-react";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/english-learning", label: "English Learning" },
      { href: "/ielts-preparation", label: "IELTS Preparation" },
      { href: "/courses", label: "Courses" },
      { href: "/dashboard/grammar", label: "Grammar Lab" },
      { href: "/dashboard/vocabulary", label: "Vocabulary" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/teachers", label: "Teachers" },
      { href: "/blog", label: "Blog" },
      { href: "/resources", label: "Resources" },
      { href: "/study-abroad", label: "Study Abroad" },
      { href: "/search", label: "Search" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            Bangla<span className="text-primary">English</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            English learning and IELTS preparation built for students across Bangladesh —
            from your first sentence to Band 9.
          </p>
          <div className="mt-4 flex gap-3">
            {[Link2, PlayCircle, Camera].map((Icon, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-soft"
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-ink">{col.title}</h4>
            <ul className="mt-3 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-5">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} BanglaEnglish. All rights reserved.</p>
          <p>Made for learners across Bangladesh 🇧🇩</p>
        </div>
      </div>
    </footer>
  );
}
