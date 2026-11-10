# Kolo brand: final assets (logo A, "Round the pot")

Chosen by Precious on 27 Oct 2026. Six members seated round the pot; the gold seat is whose turn it is (same gold as the "Now" turn token in the app). `../option_A`, `../option_B` and `../option_C` are kept for history only. Regenerate with `python3 ../src/final.py` (OG image source: `../src/og.html`).

Colours: terracotta `#A9441C`, cream `#FBF6EE`, ink `#2A1F17`, gold `#E2A93B`, dark-mode pot `#E07A4B`.

## Files and where they go (Next.js App Router)

| File | Size | Put it at | Use |
|---|---|---|---|
| `icon.svg` | 64 grid, scalable | `app/icon.svg` | Browser icon (current browsers) |
| `favicon.ico` | 16, 32, 48 | `app/favicon.ico` | Legacy favicon. 16px is simplified to pot + gold seat; 32/48 use the full mark |
| `favicon-32.png` | 32×32 | `public/favicon-32.png` | Optional PNG favicon |
| `apple-touch-icon.png` | 180×180, opaque | `app/apple-icon.png` (rename) | iOS home screen |
| `icon-192.png` | 192×192 | `public/icon-192.png` | PWA manifest |
| `icon-512.png` | 512×512 | `public/icon-512.png` | PWA manifest |
| `maskable-512.png` | 512×512, full bleed | `public/maskable-512.png` | PWA manifest, `purpose: maskable`. Mark sits inside the 80% safe zone |
| `site.webmanifest` | | `public/site.webmanifest` | Or port to `app/manifest.ts` |
| `og-image.png` | 1200×630 | `app/opengraph-image.png` (rename) | Link previews |
| `twitter-image.png` | 1200×630 | `app/twitter-image.png` | Copy of og-image |
| `kolo_lockup_light.svg` / `_1024.png` | transparent | `public/brand/` | Lockup for light backgrounds (ink wordmark). Used on 00 sign-in |
| `kolo_lockup_dark.svg` / `_1024.png` | transparent | `public/brand/` | Lockup for dark backgrounds (cream wordmark) |
| `kolo_wordmark.svg` | | `public/brand/` | Wordmark only, ink |
| `kolo_mark.svg` | | `public/brand/` | Mark for light backgrounds. App header |
| `kolo_mark_dark.svg` | | `public/brand/` | Mark for dark backgrounds |
| `favicon-16-simplified.svg` | | (source only) | The 16px simplification |
| `favicon-preview.png` | | (review only) | Favicon at 16/32/48 on light, grey and dark tab bars |

Next.js picks up `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `app/opengraph-image.png` and `app/twitter-image.png` by file convention, so they need no metadata entry.

## Metadata snippet (`app/layout.tsx`)

```ts
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Kolo", template: "%s · Kolo" },
  description: "Your savings circle, with a memory",
  applicationName: "Kolo",
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Kolo", statusBarStyle: "default" },
  openGraph: { title: "Kolo", description: "Your savings circle, with a memory", type: "website" },
  twitter: { card: "summary_large_image", title: "Kolo", description: "Your savings circle, with a memory" },
};

export const viewport: Viewport = { themeColor: "#A9441C" };
```

## Rules
- Clear space round the mark = one seat dot diameter. Minimum mark size 20px; below that use the favicon simplification.
- Don't recolour the gold seat, rotate the mark, or animate it as a loader.
