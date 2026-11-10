import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "cn";
import { Providers } from "@/components/providers";

const sans = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kolo-jade.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Kolo", template: "%s · Kolo" },
  description: "Your savings circle, with a memory",
  applicationName: "Kolo",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Kolo", statusBarStyle: "default" },
  openGraph: {
    title: "Kolo",
    description: "Your savings circle, with a memory",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Kolo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kolo",
    description: "Your savings circle, with a memory",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = { themeColor: "#A9441C" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(sans.variable, "font-sans")}>
      <body className="font-sans antialiased tabular-nums">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
