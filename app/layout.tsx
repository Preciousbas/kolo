import type { Metadata, Viewport } from "next";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import { cn } from "cn";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Kolo", template: "%s · Kolo" },
  description: "Your savings circle, with a memory",
  applicationName: "Kolo",
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Kolo", statusBarStyle: "default" },
  openGraph: {
    title: "Kolo",
    description: "Your savings circle, with a memory",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kolo",
    description: "Your savings circle, with a memory",
  },
};

export const viewport: Viewport = { themeColor: "#A9441C" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body className="font-sans antialiased tabular-nums">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
