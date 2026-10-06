import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VulnDex: History's most infamous bugs, now collectible",
    template: "%s · VulnDex",
  },
  description:
    "CVE trading cards. Collect Heartbleed, Log4Shell, EternalBlue and more, with real CVSS scores from NVD.",
  applicationName: "VulnDex",
  keywords: ["CVE", "vulnerabilities", "cybersecurity", "trading cards", "Sanity", "Next.js"],
  // Link previews in chat apps and social posts.
  openGraph: {
    type: "website",
    siteName: "VulnDex",
    title: "VulnDex: History's most infamous bugs, now collectible",
    description:
      "A trading card game where every card is a real vulnerability, from Heartbleed to Log4Shell.",
  },
  twitter: {
    card: "summary",
    title: "VulnDex: History's most infamous bugs, now collectible",
    description:
      "A trading card game where every card is a real vulnerability, from Heartbleed to Log4Shell.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05080d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
