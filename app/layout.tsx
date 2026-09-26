import type { Metadata } from "next";
import { Spectral, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "BanglaEnglish — Learn English & Ace IELTS", template: "%s" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, title: "BanglaEnglish — Learn English & Ace IELTS", description: SITE_DESCRIPTION, locale: "en_BD" },
  twitter: { card: "summary", title: "BanglaEnglish — Learn English & Ace IELTS", description: SITE_DESCRIPTION },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spectral.variable} ${inter.variable} ${jbmono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-bg text-ink"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SessionProvider session={session}>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
