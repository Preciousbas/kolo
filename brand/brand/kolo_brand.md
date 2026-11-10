# Kolo brand v1

> **Chosen: option A, "Round the pot"** (picked by Precious, 27 Oct 2026). Final production assets are in `final/`; see `final/README.md`. Options B and C stay below for history.

**Recommended: A · Round the pot.** Six members sit round the pot and one gold seat is whose turn it is, which is the exact moment every member opens the app for ("who collects this month, and when is it me?"). The same gold marks "Now" in the payout strip, so the logo teaches the UI. It reads at 32px as a dot ring.

| Option | Idea | Strength | Risk |
|---|---|---|---|
| A · Round the pot | 6 member dots round a terracotta pot, 1 gold = your turn | People-first, community, ties to the UI | Dots can read as "loading" if animated in a spin. Never spin it |
| B · The kolo | Clay savings pot (kolo = money box) with a slot and a loop inside | Most literal, warm, local | Busiest at 32px; the loop inside goes to mush |
| C · Your turn | Ring of 5 rounds, 1 segment lifted in clay, gold centre | Simplest geometry, strongest at 16–32px | Abstract, and close to a progress or loading ring |

Files per option (`option_X/`): kolo_logo_light.svg/_1024.png (ink wordmark, for light backgrounds) · kolo_logo_dark.svg/_1024.png (cream wordmark, for dark backgrounds) · kolo_mark.svg/_1024.png · kolo_mark_dark.svg/_1024.png · kolo_appicon.svg/_1024/_64/_32.png. All PNGs are transparent except the app icon tile.
Contact sheet: `kolo_logo_options.png`. Build: `python3 src/brand.py && python3 src/sheet.py`. The wordmark is Plus Jakarta Sans 800 converted to paths (fontTools + skia-pathops), tracking -0.01em.
Mark colours: light = ink #2A1F17, pot #A9441C, turn #E2A93B · dark = cream #FBF6EE, pot #E07A4B, turn #E2A93B · app icon = terracotta tile #A9441C, cream mark, gold turn.
Palette, tokens and font: `palette.json`, `tokens/`, `tokens/font.md`.
