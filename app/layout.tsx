import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://not-buy-chance.vercel.app"),
);

const title = "NotBuyChance — The perfect gift isn't by chance.";
const description =
  "Discover what someone might love. An AI taste agent for thoughtful gifts, experiences, and unexpected discoveries, grounded in Qloo.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "NotBuyChance",
  title,
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "NotBuyChance",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="taste" className={`${geist.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Suspense fallback={<div className="h-16" />}>
          <SiteHeader />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
