# Font: Plus Jakarta Sans (Google Fonts, OFL)
One family, weights 500/600/700/800. Chosen over Inter because its rounder bowls read warmer at display sizes and it ships the naira sign (U+20A6) natively, so `₦20,000` never falls back to a system font.
Next.js: `import { Plus_Jakarta_Sans } from 'next/font/google'; const font = Plus_Jakarta_Sans({ subsets:['latin','latin-ext'], weight:['500','600','700','800'], variable:'--font-sans' })`.
All amounts use tabular figures (`font-feature-settings:'tnum'` or Tailwind `tabular-nums`).

| Token | Size/line | Weight | Use |
|---|---|---|---|
| text-display | 32/38 | 800 | Pot amount, score number |
| text-h1 | 24/30 | 800 | Screen title |
| text-h2 | 20/26 | 700 | Section title, before/after chips on 04 |
| text-h3 | 17/24 | 700 | Card title, member name |
| text-body | 15/22 | 500 | Default copy |
| text-small | 13/18 | 500 | Meta: time, source |
| text-micro | 12/16 | 700, +0.04em, uppercase | Labels: "NOTICED", "CHANGED" |
Wordmark: Plus Jakarta Sans 800, converted to paths (never typeset the logo live).
