import { getPlanByCode } from "@/lib/services/plans";
import { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContactForm } from "./contact-form";
import { contactInfo, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Contact — BanglaEnglish", description: "Questions about courses, pricing or your account? Get in touch with the BanglaEnglish team.", path: "/contact" });

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string; period?: string }> }) {
  const { plan, period } = await searchParams;
  const info = contactInfo();
  const planRow = plan ? getPlanByCode(plan.toUpperCase().slice(0, 20)) : undefined;
  const defaultMessage = planRow && planRow.rank > 0 ? `Hello, I would like to upgrade to the ${planRow.name} plan (${period === "yearly" ? "yearly" : "monthly"}). Please tell me how to pay.` : "";
  return (
    <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-medium text-primary">Contact</p>
        <h1 className="mt-1.5 font-display text-3xl text-ink">Get in touch</h1>
        <p className="mt-3 max-w-sm text-sm text-ink-soft">
          Questions about courses, pricing, or your account? We usually reply within one
          business day.
        </p>
        <div className="mt-8 flex flex-col gap-4">
          {info.email && <ContactRow icon={Mail} label={info.email} />}
          {info.phone && <ContactRow icon={Phone} label={info.phone} />}
          <ContactRow icon={MapPin} label={info.address} />
        </div>
      </div>
      <Card className="p-6 sm:p-8">
        <ContactForm defaultMessage={defaultMessage} />
      </Card>
    </div>
  );
}

function ContactRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </div>
  );
}
