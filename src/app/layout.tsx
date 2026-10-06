import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-google-sans", display: "swap" });
const googleSansCode = Google_Sans_Code({ subsets: ["latin", "latin-ext"], variable: "--font-google-sans-code", display: "swap" });

export const metadata: Metadata = {
  title: "Traduttore Wencheng · 文成话",
  description: "Italiano → Wenchenghua (Daxue), con la pronuncia scritta all'italiana",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#13308f" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1a3d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${googleSans.variable} ${googleSansCode.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
