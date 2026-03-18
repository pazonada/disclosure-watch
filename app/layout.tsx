import type { Metadata } from "next";
import { Inter, Special_Elite } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Disclosure Watch — UAP government disclosure dashboard",
  description:
    "Track U.S. government UAP disclosure activity: congressional hearings, FOIA releases, National Archives records, and key milestones — summarized in plain English.",
  keywords: ["UAP", "UFO", "AARO", "disclosure", "government", "unidentified anomalous phenomena", "disclosure watch"],
  other: {
    "image-credit": "Hero photo by Javier Miranda on Unsplash",
  },
  openGraph: {
    title: "Disclosure Watch — UAP government disclosure dashboard",
    description:
      "Track U.S. government UAP disclosure activity: congressional hearings, FOIA releases, National Archives records, and milestones.",
    type: "website",
    url: "https://disclosurewatch.com",
    locale: "en_US",
    images: [
      {
        url: "https://disclosurewatch.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Disclosure Watch — UAP government disclosure dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Disclosure Watch",
    description: "Track U.S. government UAP disclosure in one place.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${specialElite.variable} min-h-screen bg-background text-foreground font-sans antialiased grid-bg relative`}>
        {/* Scanline overlay for tech effect */}
        <div className="fixed inset-0 scanline z-50 pointer-events-none" />
        <Header />
        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-[var(--lime-5)] via-transparent to-[var(--blue-5)]" />
          <div className="relative">{children}</div>
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
