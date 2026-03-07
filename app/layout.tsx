import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Disclosure Watch — UAP Government Disclosure Dashboard",
  description:
    "Track U.S. government UAP disclosure activity in one place. AARO records, congressional hearings, FOIA releases, and key milestones — summarized in plain English.",
  keywords: ["UAP", "UFO", "AARO", "disclosure", "government", "unidentified anomalous phenomena", "disclosure watch"],
  openGraph: {
    title: "Disclosure Watch — UAP Government Disclosure Dashboard",
    description:
      "Track U.S. government UAP disclosure activity. AARO records, hearings, FOIA releases, and milestones.",
    type: "website",
    url: "https://disclosurewatch.com",
    locale: "en_US",
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
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
