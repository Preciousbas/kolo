import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "cn";
import { Providers } from "@/components/providers";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" className={cn("font-sans", sans.variable)}>
      <body className={`${sans.className} antialiased tabular-nums`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
