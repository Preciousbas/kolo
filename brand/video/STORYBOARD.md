# Kolo demo video: storyboard

Studio · v1.1 · 27 Oct 2026 · due Sun 8 Nov 2026 · 1920×1080 · 30 fps · **total runtime 2:52** (172 s, target 2:30–3:00).

Built from brief §4 #1 demo plan, adjusted for what the build actually does:
- **Sign-in is wallet-first:** "Connect wallet" → pick Slush in the wallet sheet → approve (screens 00 → 00a → 00c). No Google/zkLogin beat.
- **Money is test mode.** Test USDC on Sui testnet (final); the naira top-up is simulated in-app. The voiceover says so twice, a lower-third says so, and the end card says so.
- **Walrus network is not confirmed.** Precious decides on Mainnet around 5 Nov. Every default line says "memories saved on Walrus", with no network named. `_mainnet` files and the "Mainnet alt" voiceover below are ready; **use them only after Precious approves mainnet.**
- **The feed is not real-time.** It shows "Updated N min ago" and a refresh button. "Live" appears only in the 30 s after a refresh, so we show it once, right after tapping refresh on camera.
- **Automatic payout (beat 8b).** When the last member pays, the pot goes to that round's recipient in the same transaction; no one presses a button. If auto payout doesn't ship, use the manual-fallback variant (one-tap "Release payout to Bisi").
- **Lender check costs $0.01** (pay-per-call, USDC on Sui).

Judging key: **I** = Walrus + Tatum integration (30%) · **T** = technical (30%) · **C** = creativity (20%) · **P** = presentation (20%) · **M** = Best Walrus Memory ("memories that visibly change the product").

Files: `frames/` = full-frame cards · `overlays/phone_*.png` = phone layout with a hole for the recording · `overlays/callout_*`, `overlays/lt_*` = transparent annotations · `mp4/` = animated pieces · `R1`…`R11` = recordings from the shot list in `EDIT_GUIDE.md`.

Voiceover: plain words, about 2.4 words/second. Never say blob, object, zkLogin, x402 or MPP. Sponsor names (Walrus Memory, Tatum, Sui) are fine in the voiceover, and are said in beats 2, 7, 10e, 14 and 15.

| # | Time | Dur | On screen | Voiceover | Proves |
|---|---|---|---|---|---|
| 0 | 0:00–0:02 | 2 s | `mp4/kolo_logo_sting.mp4` | (none, soft hit) | P |
| 1 | 0:02–0:06 | 4 s | `frames/01_title.png` | "This is Kolo: your savings circle, with a memory." | P, C |
| 2 | 0:06–0:16 | 10 s | `frames/02_hook_a.png` (0:06) → `_b` (0:09) → `_c` (0:12). Text card, no fake chat UI | "In an ajo, friends pool money each month and take turns collecting it. On WhatsApp, people forget who's paid. The group chat forgets. Kolo remembers." | C (real problem), P |
| 3 | 0:16–0:18 | 2 s | `frames/03_chapter_1.png` | (none) | P |
| 4 | 0:18–0:26 | 8 s | `overlays/phone_b1-signin.png` over **R1**. At 0:21 add `overlays/lt_test_mode.png` (3 s) | "Ngozi taps Connect wallet, picks Slush and approves. No new password. Money in this demo is test mode, on Sui testnet." | T, P (honest) |
| 5 | 0:26–0:36 | 10 s | `phone_b2-create.png` over **R2** | "She starts Balogun Street Ajo: six friends, twenty thousand naira a month, and a payout order everyone can see." | C, T |
| 6 | 0:36–0:38 | 2 s | `frames/03_chapter_2.png` | (none) | P |
| 7 | 0:38–0:50 | 12 s | `phone_b3-pay.png` over **R3**. At 0:45 `overlays/callout_pending.png` | "She pays her share. Until the circle updates, it says 'sent, waiting to show up'. The pot lives on Sui; Kolo reads each payment through Tatum." | I (Tatum Sui), T |
| 8 | 0:50–1:00 | 10 s | `phone_b4-feed.png` over **R4**. 0:51 `callout_feed_updated.png`; 0:55 (after the refresh tap) `callout_feed_live.png` | "Tap refresh: everyone sees who's paid and whose turn it is. Right after a refresh it says Live; otherwise, when it last checked." | T, P |
| **8b** | **1:00–1:10** | **10 s** | **Auto payout.** `phone_b8-payout.png` over **R11a** (1:00–1:06): 5 of 6 paid → Tunde pays → refresh → 02g "Round 3 complete · Pot paid to Bisi · ₦120,000", strip moves to "You · Now". At 1:02 `overlays/callout_payout_auto.png` ("No one pressed pay out: Kolo did it when the last member paid"). Cut to **R11b** (1:06–1:10): Bisi's phone, 02h "Your turn came", Test mode badge visible. Stand-ins: `previews/preview_02g-home-payout-done.png`, `preview_02h-payout-received.png` | "Then Tunde pays, the last share. Kolo pays the whole pot to Bisi in the same step. Nobody pressed a button. Bisi just sees: your turn came." | T, C |
| 9 | 1:10–1:12 | 2 s | `frames/03_chapter_3.png` | (none) | P |
| **10** | **1:12–1:52** | **40 s** | **HERO: What Kolo learned**, in 5 parts | | **M, I, C** |
| 10a | 1:12–1:19 | 7 s | `phone_b5-learned.png` over **R5** (timeline opens and scrolls slowly) | "Three rounds in, Kolo has noticed how each person pays, and every note changed something in the app." | M |
| 10b | 1:19–1:29 | 10 s | **Before→after.** 1:19–1:22 **R6a** (before: home shows "reminder · 25th, 9:00"). 1:22–1:26 `mp4/kolo_hero_swap_insert.mp4` (or R5 zoomed on Tunde's card if crisp). 1:26–1:29 **R6b** (after: home shows "Kolo noticed Tunde pays on the 27th"), with `callout_hero_reminder.png` | "Tunde paid late three times, always on the 27th, his payday. So Kolo moved his reminder from the 25th at nine to the 27th at eight." | **M** (memory visibly changes the product) |
| 10c | 1:29–1:38 | 9 s | **R5** continues: payout-order card (Tunde ↔ Femi swap), then tap **Undo** on one note → "That's wrong? Undo it" (04b) | "It also swapped Tunde and Femi in the payout order. Don't agree? Undo it, and Kolo remembers that too." | M, C |
| 10d | 1:38–1:46 | 8 s | **R5**: tap "Saved securely" on Tunde's note (`callout_hero_saved.png`) → cut to **R7**, the proof page, with `lt_saved_securely.png` (Mainnet variant: `lt_saved_securely_mainnet.png`, only after approval) | "Every note is saved securely in Walrus Memory, with a link anyone can check." | **I** (Walrus) |
| 10e | 1:46–1:52 | 6 s | **R10** (optional; depends on mainnet approval): Walrus Memory dashboard showing the memory count, IDs blurred. Fallback: hold R5 full timeline | "That's what Kolo remembers: memories saved on Walrus, not on one phone." | I |
| 11 | 1:52–1:54 | 2 s | `frames/03_chapter_4.png` | (none) | P |
| 12 | 1:54–2:14 | 20 s | `phone_b6-lender.png` over **R8**: 05a consent → 05b paying → 05c result (`callout_lender_paid.png` at 2:05) → 05d Emeka not allowed | "A lender, Tally Desk, wants to know if Ngozi is reliable. She has said yes. Its agent pays one cent in USDC on Sui for the check (test USDC here) and gets a score, not her amounts or friends. Emeka said no, so his stays private." | I, T (agent pays per call), C |
| 13 | 2:14–2:16 | 2 s | `frames/03_chapter_5.png` | (none) | P |
| 14 | 2:16–2:32 | 16 s | `phone_b7-wallet.png` over **R9**: 06a → Add money → 06c confirming → done → 06e receipt. `lt_tatum_prices.png` at 2:20; `callout_receipt_simulated.png` at 2:27 | "People think in naira. Ngozi adds fifty thousand naira and Kolo turns it into dollars at a rate from Tatum. In this demo the naira is simulated. No real naira moves, and the receipt says so." | I (Tatum prices), P (honest) |
| 15 | 2:32–2:48 | 16 s | `frames/06_architecture.png` (footer "Memories saved on Walrus"; Mainnet variant `06_architecture_mainnet.png`, only after approval). Optional 3 s cut-in at 2:42: **R10b**, the Tatum dashboard call count | "How it works. The app talks to the Kolo agent. The agent remembers each member's habits in Walrus Memory, and reads payments, balances and prices through Tatum. The savings pot sits on Sui and pays out by itself. Lenders pay per check." | **I, T** |
| 16 | 2:48–2:52 | 4 s | `mp4/kolo_end_card.mp4` (static: `frames/07_end_card.png`). Mainnet variant `kolo_end_card_mainnet.mp4`, only after approval | "Kolo. Your savings circle, with a memory." | P |

**Runtime check:** 2 + 4 + 10 + 2 + 8 + 10 + 2 + 12 + 10 + **10** + 2 + 40 + 2 + 20 + 2 + 16 + 16 + 4 = **172 s = 2:52**. The new 10 s payout beat (8b) is paid for by cutting the hook from 14 s to 10 s, so the total rose 6 s. That leaves 8 s of headroom under 3:00. If you need to trim, 10e can lose 3 s.

**Alternative voiceover lines** (swap in only when the condition is true):

| Beat | Condition | Line |
|---|---|---|
| 10e | **Mainnet alt: use only after Precious approves mainnet** (decision around 5 Nov) | "That's what Kolo remembers: memories saved on Walrus Mainnet, not on one phone." |
| 8b | **Manual fallback:** auto payout didn't ship (record R11-manual; use `callout_payout_manual.png`, "Pot full: one tap released it to Bisi") | "Then Tunde pays, the last share. The pot is full, so Ngozi releases it to Bisi with one tap. Bisi just sees: your turn came." |
| 15 | **Manual fallback** | Drop "and pays out by itself": "…The savings pot sits on Sui. Lenders pay per check." |

**Voiceover word count:** about 370 words, around 2.2–2.7 words a second per beat. Record it at a relaxed pace, then lay it to picture. Chapter cards have no voiceover so the viewer can breathe.

**Mapping to criteria**
- Walrus Memory is named in 10d, 10e and 15, and its proof is shown in 10d.
- Tatum is named in 7, 14 and 15.
- Sui is named in 4, 7, 12 and 15.
- The automatic payout (a technical point: payout happens in the same transaction as the last payment) is shown in 8b and named again in 15.

**Honesty lines** (keep all of them):
- the 0:21 lower-third and voiceover "test mode, on Sui testnet";
- 2:05 "test USDC here";
- 2:27 "the naira is simulated", plus the receipt line;
- the Test mode badge on Bisi's payout screen in 8b;
- the footer of the architecture slide;
- the end-card footer.

If any of these facts change in the build, for example the pot moves to mainnet, fix the voiceover and those frames. Never say "Mainnet" for Walrus until Precious approves it; then swap in the `_mainnet` set as one batch. See the pre-publish checks in EDIT_GUIDE.
