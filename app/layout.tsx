import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/config";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const pixelFont = localFont({
  src: "./fonts/pixelify-sans-latin-wght.woff2",
  variable: "--font-pixel",
  weight: "400 700",
  display: "swap",
});

const groteskFont = localFont({
  src: "./fonts/space-grotesk-latin-wght.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});

const monoFont = localFont({
  src: "./fonts/jetbrains-mono-latin-wght.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE.name} — Choose UR Competition`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Choose UR Competition`,
    description: SITE.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Choose UR Competition`,
    description: SITE.tagline,
  },
};

export const viewport: Viewport = {
  themeColor: "#04030b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${pixelFont.variable} ${groteskFont.variable} ${monoFont.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only z-[100] bg-neon-cyan px-4 py-2 font-mono text-sm text-void-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
