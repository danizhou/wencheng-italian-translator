import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-google-sans", display: "swap" });
const googleSansCode = Google_Sans_Code({ subsets: ["latin", "latin-ext"], variable: "--font-google-sans-code", display: "swap" });

const TITLE = "Traduttore Wenzhouhua · 温州话";
const DESCRIPTION = "Italiano → dialetti dell'area di Wenzhou (Wencheng, Qingtian), con la pronuncia scritta all'italiana";

// Link previews need absolute URLs: the site's own address (SITE_URL overrides it, e.g. for a preview deploy)
const SITE_URL = process.env.SITE_URL ?? "https://wenzhouhua.clicktoconnect.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Traduttore Wenzhouhua",
  // The images come from the opengraph-image / twitter-image files in this folder (npm run build:icons)
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Traduttore Wenzhouhua", locale: "it_IT", type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
