# Kolo demo video: edit guide

You assemble this, not design it: every card, overlay and insert is already rendered at 1920×1080. You only drop in screen recordings and the voiceover. Read it alongside `STORYBOARD.md`, which has the timecodes and the voiceover.

## 1. What's in `video/`

| Folder / file | What it is | How to use |
|---|---|---|
| `frames/01_title.png` | Title card | Full frame, 4 s |
| `frames/02_hook_a/b/c.png` | Hook text, building line by line | a → b → c, cross-dissolve 6 frames |
| `frames/03_chapter_1…5.png` | Chapter cards (gold dot = current chapter) | Full frame, 2 s each |
| `frames/04_phone_template.png` | Blank phone layout, with the drop zone marked | Reference only |
| `frames/05_callout_example.png`, `05_lower_third_example.png` | How a callout and a lower-third should look | Reference only |
| `frames/06_architecture.png` | Architecture slide naming Walrus Memory, Tatum and Sui. Footer says "Memories saved on Walrus" | Full frame, 16 s. Slow push-in from 100% to 104% |
| `frames/06_architecture_mainnet.png` | Same slide, footer says "…Walrus Mainnet" | **Use only after Precious approves mainnet** |
| `frames/07_end_card.png` / `07_end_card_mainnet.png` | Static end card (default / Mainnet footer) | Backup for the mp4 |
| `overlays/phone_b1…b8-*.png` (b8 = payout) | **Phone layout with a transparent hole** where the screen is, plus that beat's headline | Track above the recording |
| `overlays/phone_template_overlay.png` | The same overlay with placeholder text | Use for any extra beat |
| `overlays/callout_*.png` | Transparent callouts: label card + arrow, aimed at our screen layout | Track above the overlay. Nudge if the live UI differs |
| `overlays/lt_*.png` | Transparent lower-thirds (bottom right, under the headline). `lt_saved_securely_mainnet.png` is the Mainnet variant | Track above, 3–4 s. Mainnet variant only after approval |
| `previews/preview_02-home/02g/02h/04-learned/05c/06e.png`, `preview_callout_payout_auto/manual.png` | The phone layout filled with our static designs | Shows how the result should look. **Emergency stand-ins** if a recording fails |
| `mp4/kolo_logo_sting.mp4` | 2 s logo sting | Start of the video |
| `mp4/kolo_hero_swap_insert.mp4` | 4 s before→after chip swap (25th 9:00 struck → 27th 8:00) | Beat 10b, or whenever the live recording isn't crisp |
| `mp4/kolo_end_card.mp4` | 4 s end card, footer "…memories saved on Walrus" | Last shot |
| `mp4/kolo_end_card_mainnet.mp4` | Same, footer "…Walrus Mainnet" | **Use only after Precious approves mainnet** |
| `src/` | Generators (`frames.py`, `sting.py`, `anim.py`) | Edit text there and re-run if copy changes |

All mp4s are H.264, yuv420p, 1920×1080, 30 fps.

## 2. Phone placement (the one number that matters)

The screen hole in every `phone_*.png` overlay is **420 × 909 px**, top-left corner at **x 258, y 85**, with a 46 px corner radius. Its centre is (468, 539.5).
- **Recording at 780 × 1688** (390×844 at 2x): scale it to **53.85%**.
- **Recording at 1170 × 2532** (3x): scale it to 35.9%.

| App | Setting |
|---|---|
| **CapCut** (desktop) | Canvas 16:9 1920×1080, 30 fps. Put the recording on the main track and the `phone_*.png` overlay on an overlay track above it, full frame, Position X 0 / Y 0. Recording: Scale **54%**, Position **X −492, Y 0**. CapCut measures from the centre. If the edges show, raise the scale 1% at a time; the bezel hides up to about 8 px of slop. |
| **DaVinci Resolve** | Timeline 1920×1080, 30 fps. V1 = recording, Inspector → Transform: Zoom **0.5385**, Position X **−492**, Y **0**. V2 = `phone_*.png` overlay, no transform. V3 = callouts and lower-thirds. Set each still's duration in Preferences → Editing → Standard still duration, or trim it on the timeline. |

The background lives in the overlay itself (cream, with the headline on the right), so nothing goes under the recording.

## 3. Assembly order (DaVinci or CapCut)

1. **V1.** Lay out the full-frame pieces in storyboard order: sting → title → hook a/b/c → chapter 1 → … → architecture → end card. Leave gaps for the phone beats, with the durations from STORYBOARD.md.
2. **V1, in the gaps.** Drop recordings R1–R9 and R11.
3. **V2.** Add the matching `phone_b*.png` over each phone beat (b1 sign-in, b2 create, b3 pay, b4 feed, **b8 payout** for beat 8b, b5 learned for all of beat 10, b6 lender, b7 wallet).
4. **V3.** Add callouts and lower-thirds at the storyboard times. Fade them in over 6 frames, hold 3 s, fade out over 6 frames.
5. **Beat 10b.** Cut to `mp4/kolo_hero_swap_insert.mp4` full frame. It replaces the phone layout for those 4 s; cut on the strike. Then return to the phone overlay for R6b.
6. **A1.** Voiceover. **A2.** Music bed, ducked to about −20 dB under the voice. Add a soft hit on the sting and on the hero chip pop (≈1:24).
7. **Transitions.** Hard cuts between phone beats; a 6-frame dissolve into and out of chapter cards. No spins, no wipes.
8. **Export.** H.264 MP4, 1920×1080, 30 fps, 16–20 Mbps (or CRF 18), AAC 320 kbps, loudness around −14 LUFS. Upload unlisted to YouTube and put the link on the form.

## 4. Recording settings (phone screens)

- **Browser:** Chrome, a fresh profile with no extensions except the test wallet. Open DevTools → Toggle device toolbar → add a custom device "Kolo 390": **390 × 844, device pixel ratio 2, Mobile, touch**. Zoom 100%. Close DevTools docking (undock it) so it doesn't squeeze the viewport.
- **Capture:** OBS (free).
  - Window Capture of Chrome, cropped to exactly the viewport. Use Crop/Pad or Alt-drag.
  - Base and output canvas **780 × 1688**, **30 fps**, recording format **MKV → remux to MP4**, encoder x264 CRF 16 or NVENC CQ 18.
  - On a 1x display, set the device-toolbar zoom to 200% so the capture really has 780 px of width.
  - On macOS you can also use QuickTime → New Screen Recording → selected area, with Chrome on a Retina screen.
- **Touch cursor:** keep the device toolbar's circle cursor. Click slowly, about 0.5 s between taps. Pause 1 s on every new screen before acting.
- **Quiet screen:** notifications off (Do Not Disturb). No bookmarks bar. Wallet popups recorded in the same crop if possible; otherwise record them as a separate clip.
- **Scroll:** use the trackpad slowly or the keyboard (↓ 3 times), not a flick.
- **Takes:** record each shot 2–3 times. Name the files `R1_take2.mp4` and so on.
- **Real app vs designs:** match the static designs where you can. The overlays' callouts are aimed at the design layout.

## 5. Shot list: what Precious records from the live app

The demo data is the same everywhere:
- **Circle:** Balogun Street Ajo, 6 members, ₦20,000 a month (≈ $13.40). Round 3 of 6, due Wed 25 Nov.
- **Payout order:** Ada → Emeka → Bisi (now) → Ngozi → Femi → Tunde.
- **Signed in as:** Ngozi Eze.
- **Lender:** Tally Desk.
- **Rate:** $1 = ₦1,492.50.

Use a **seeded demo circle on testnet** so you can reset between takes.

| Shot | Beat | Length to capture | What to do on camera | Data state needed before you start |
|---|---|---|---|---|
| **R1** Sign-in | 4 | 12 s | Open Kolo (00) → "Connect wallet" → wallet sheet (00a), tap **Slush** → "Approve in Slush" (00c) → approve in the Slush pop-up → land on home or the create screen. Hold 1 s on the sheet so the viewer can read it | Logged out. Slush extension (Sui testnet) installed and unlocked, holding Ngozi's account and some test USDC. Not needed in the cut: the no-wallet sheet (00b), so don't record it |
| **R2** Create circle | 5 | 15 s | Start a circle → name "Balogun Street Ajo" → ₦20,000 · Monthly → add members / show invite → payout order → Create | Fresh account with no circles (or a second wallet). Members can be pre-filled from seed data |
| **R3** Pay | 7 | 15 s | Home (unpaid) → "Pay my ₦20,000" → progress → Paid → back to home showing **"Sent · waiting to show up"** | Seeded circle, round 3. Ngozi has **not** paid; 4 of 6 paid (Ada, Emeka, Femi, Bisi). Kolo balance ≥ $13.40 test USDC |
| **R4** Feed refresh | 8 | 12 s | Hold on home showing **"Updated N min ago"** (wait at least 1 min after the last fetch) → tap refresh → "Updating…" → **Live** dot with Ngozi's payment at the top | Straight after R3 (same state). This is the only shot that should show "Live" |
| **R5** What Kolo learned | 10a, 10c, 10d | 35 s | Open the Learned tab → pause → scroll slowly through the Tunde reminder card → payout swap card → Emeka risk → Bisi morning → tap **Undo** on Bisi's card → confirm → tap **Saved securely** on Tunde's card | Memories already written: at least 4 learned entries (Tunde pays on the 27th → reminder moved 25th 9:00 → 27th 8:00; Tunde/Femi swap; Emeka flagged; Bisi prefers mornings). Ten or more memories saved on Walrus overall (see the Mainnet note under this table) |
| **R6a** Before | 10b | 5 s | Home **before** learning: the activity row "Kolo sent Tunde a reminder · 25th, 9:00", with no "Kolo noticed" strip | A snapshot circle at round 1 (or toggle learning off for a demo account). Same names and amounts |
| **R6b** After | 10b | 5 s | Home after learning: the **"Kolo noticed Tunde pays on the 27th"** strip and the reminder row "moved to the 27th for him" | Same as R4/R5 state |
| **R7** Proof | 10d | 8 s | The page that "Saved securely" opens, showing the memory record on Walrus: ID, time, owner | Logged-in proof page. Hide or blur anything secret (keys, emails) |
| **R8** Lender check | 12 | 25 s | As Tally Desk: Score check → Ngozi → consent shown → "Check score · $0.01" → paying → result "Very reliable 92" with "Paid $0.01" → back → Emeka → "Not allowed" | Lender wallet with ≥ $0.05 test USDC. Ngozi consent **on**, Emeka consent **off** |
| **R9** Wallet / naira | 14 | 25 s | Wallet → Add money → Naira → ₦50,000 → Add → "Confirming your quote…" → "$33.50 added" → View receipt (show the "Simulated · no real naira moved" line). Optional: open View details | Test mode on. Tatum rate loaded (shows "Tatum price data · updated hh:mm") |
| **R11** Auto payout | 8b | 15 s, in two clips | **R11a, Ngozi's phone:** home showing **5 of 6 paid** with Tunde still to pay (like 02c) → Tunde pays from his wallet (second Chrome profile, or the seed script's "pay as Tunde" step, off camera) → tap refresh → home shows **"Round 3 complete · Pot paid to Bisi · ₦120,000"**, the payout strip moves to **You · Now**, and the feed item says **"Round 3 complete · pot paid to Bisi"** (02g). Nobody taps a payout button. **R11b, Bisi's phone** (third profile): open Kolo → **"Your turn came. ₦120,000 is in your Kolo balance"** with the Test mode badge (02h). Hold 2 s | Seeded circle, **round 3, 5 of 6 paid**: Ada, Emeka, Femi, Bisi and Ngozi have paid, **Tunde has not**. Tunde's wallet holds ≥ $13.40 test USDC. Recipient = **Bisi**. Auto payout on. Reset the seed between takes, because a pot can only pay out once |
| **R11-manual** *(fallback, only if auto payout doesn't ship)* | 8b | 15 s | Same start. After Tunde pays → refresh → **"The pot is full"** + **"Release payout to Bisi"** (02i) → tap → "Releasing…" (02i2) → round complete (02g, but the card says "You released it") → R11b as above | Same seed. Signed in as Ngozi (the organiser). Swap `callout_payout_auto.png` for `callout_payout_manual.png` and use the manual voiceover in STORYBOARD 8b |
| **R10** *(optional, depends on mainnet approval)* | 10e | 6 s | Walrus Memory dashboard showing the memory count for the Kolo agent | Logged in. **Blur account and delegate key IDs**. Record it on whichever network the build uses; if it shows "Mainnet" on screen, use it only after Precious approves mainnet (around 5 Nov). Otherwise use the R5 fallback |
| **R10b** *(optional)* | 15 | 4 s | Tatum dashboard usage page (API calls during the demo) | Logged in. **Blur API keys and the account ID** |

**Walrus Mainnet note:** Mainnet is **not confirmed**. Precious decides around 5 Nov. Until then, every frame and voiceover line says "memories saved on Walrus", with no network named. R10 and the "10 or more memories" requirement depend on that decision: count the memories on whichever network the build writes to, and only call it Mainnet once Precious approves.

Total raw capture: about 3 minutes 15 seconds plus retakes. Allow 55 minutes, including resets (R11 needs a fresh seed each take).

## 6. Pre-publish checks

- [ ] The voiceover and frames say **test mode / Sui testnet / naira simulated**, and that is still true of the build. If the pot or score payment moved to mainnet, change `lt_test_mode`, the architecture footer and the end-card footer in `src/` and re-run.
- [ ] **Walrus network.** The default kit says "memories saved on Walrus", with no network named. **Use the `_mainnet` files only after Precious approves mainnet** (around 5 Nov). Swap them in as a set:
  - `frames/06_architecture.png` → `frames/06_architecture_mainnet.png`;
  - `mp4/kolo_end_card.mp4` → `mp4/kolo_end_card_mainnet.mp4` (static: `frames/07_end_card_mainnet.png`);
  - `overlays/lt_saved_securely.png` → `overlays/lt_saved_securely_mainnet.png`;
  - the 10e voiceover → the "Mainnet alt" line in STORYBOARD.md.
- [ ] 10 or more memories are saved (a submission requirement), counted on the network the build really uses. Showing R10 depends on the mainnet decision above.
- [ ] **Payout beat matches the build.** If auto payout shipped, use R11 + `callout_payout_auto.png`. If not, use R11-manual + `callout_payout_manual.png` and the manual voiceover line.
- [ ] No keys, seed phrases, emails or account IDs are visible in any recording frame.
- [ ] "Live" appears only in R4.
- [ ] Runtime is between 2:30 and 3:00 (storyboard = 2:52).
- [ ] The repo URL `github.com/Preciousbas/kolo` exists and is public before you upload. It is a placeholder until then.
- [ ] Captions: export an .srt from the voiceover (CapCut auto-captions, then fix the spelling of "ajo", "Tunde", "Ngozi" and "Tatum").

## 7. Regenerating

```
cd video/src
python3 frames.py   # cards, overlays, previews  (Chrome + Playwright)
python3 sting.py    # mp4/kolo_logo_sting.mp4    (cairosvg + ffmpeg)
python3 anim.py     # mp4/kolo_hero_swap_insert.mp4, mp4/kolo_end_card.mp4
```
