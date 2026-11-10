import Link from "next/link";
import { KoloLogo } from "@/components/kolo-logo";
import { readCircle } from "@/lib/circle";
import {
  demoNameByAddress,
  readSavedDemoState,
  resolveDemoCircleId,
  savedStateAsCircleView,
} from "@/lib/demo-state";
import { getPackageId, tatumApiKey } from "@/lib/config";
import {
  getCircleEvents,
  hasLiveTatumEnv,
  readFeedCursor,
  type KoloEvent,
} from "@/lib/feed";
import { getMemberTrust, type MemberTrust } from "@/lib/member-trust";
import { toNaira } from "@/lib/price";

export const dynamic = "force-dynamic";
export const revalidate = 15;

function moneyUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyNgn(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FeedFreshness(props: {
  via: string | null;
  checkpoint: string | null;
  updatedAt: string | null;
  live: boolean;
}) {
  const ageMs = props.updatedAt ? Date.now() - Date.parse(props.updatedAt) : null;
  const ageLabel =
    ageMs === null || !Number.isFinite(ageMs)
      ? "unknown"
      : ageMs < 60_000
        ? `${Math.max(0, Math.round(ageMs / 1000))}s ago`
        : `${Math.round(ageMs / 60_000)}m ago`;

  return (
    <p className="mt-4 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-small text-muted-foreground">
      {props.live ? "Live from Tatum" : "Saved demo state"}
      {props.via ? ` · via=${props.via}` : ""}
      {props.checkpoint ? ` · checkpoint ${props.checkpoint}` : ""}
      {` · feed ${ageLabel}`}
    </p>
  );
}

export default async function DemoCirclePage() {
  const saved = readSavedDemoState();
  const circleId = resolveDemoCircleId();
  let view = savedStateAsCircleView(saved);
  let showingSaved = true;
  let events: KoloEvent[] = [];
  let feedVia: string | null = null;
  let potNgn: number | null = null;
  let priceNote: string | undefined;

  if (circleId && hasLiveTatumEnv() && tatumApiKey()) {
    try {
      view = await readCircle({
        id: circleId,
        packageId: getPackageId() || saved.packageId || undefined,
        nameByAddress: demoNameByAddress(saved),
      });
      showingSaved = view.via === "saved";
      const feed = await getCircleEvents(circleId, {
        packageId: getPackageId() || saved.packageId || undefined,
        coinType: saved.coinType || undefined,
      });
      events = feed.events.filter((e) => e.kind === "contributed" || e.kind === "paid_out");
      feedVia = feed.via;
    } catch {
      view = savedStateAsCircleView(saved);
      showingSaved = true;
    }
  }

  try {
    const priced = await toNaira(view.potUsd);
    potNgn = priced.amountNgn;
    priceNote = priced.note;
  } catch {
    potNgn = null;
    priceNote = "naira price unavailable";
  }

  const cursor = readFeedCursor();
  const paidCount = view.paid.filter(Boolean).length;
  const recipientName =
    view.members.find((m) => m.address === view.recipient)?.name ||
    saved.recipientName ||
    view.recipient;

  const paymentList =
    events.length > 0
      ? events
      : view.payouts.map((p) => ({
          kind: "paid_out" as const,
          member: p.recipient,
          round: p.round,
          amountRaw: String(Math.round(p.amountUsd * 1_000_000)),
          txDigest: p.txRef,
          explorerUrl: p.txRef ? `https://suiscan.xyz/testnet/tx/${p.txRef}` : "",
          timestampMs: p.paidAt ? Date.parse(p.paidAt) : 0,
        }));

  const trustByAddress: Record<string, MemberTrust> = {};
  if (circleId) {
    await Promise.all(
      view.members.map(async (m) => {
        if (!m.address || m.address.startsWith("member-")) return;
        try {
          trustByAddress[m.address] = await getMemberTrust(circleId, m.address, {
            memberLabel: m.name || "Member",
            packageId: getPackageId() || saved.packageId || undefined,
          });
        } catch {
          // panel falls back to empty
        }
      }),
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-background px-6 py-8 text-foreground">
      <nav className="mb-8 flex items-center justify-between text-sm">
        <Link href="/" className="active:scale-95" aria-label="Kolo home">
          <KoloLogo variant="lockup" />
        </Link>
        <span className="rounded-full border border-dashed border-warning bg-warning-soft px-3 py-1 text-micro font-bold uppercase tracking-wide text-warning">
          Test mode · not real money
        </span>
      </nav>

      <p className="mb-2 text-micro font-bold uppercase tracking-[0.04em] text-muted-foreground">
        Demo circle
      </p>
      <h1 className="text-h1 font-extrabold tracking-tight text-foreground">{saved.name}</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Round {view.round} of {view.rounds}
      </p>

      <FeedFreshness
        live={!showingSaved}
        via={feedVia || (showingSaved ? null : String(view.via))}
        checkpoint={cursor.lastCheckpoint}
        updatedAt={cursor.updatedAt || saved.updatedAt}
      />

      {showingSaved ? (
        <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-small text-muted-foreground">
          showing saved state
        </p>
      ) : null}

      <section className="mt-8 rounded-[20px] border border-border bg-card p-5 shadow-sm">
        <p className="text-micro font-bold uppercase tracking-[0.04em] text-muted-foreground">
          Pot this round
        </p>
        <p className="mt-2 text-display font-extrabold tabular-nums">
          {moneyUsd(view.potUsd)}
          <span className="ml-2 text-body font-medium text-muted-foreground">
            of {moneyUsd(view.amountUsd * view.rounds)}
          </span>
        </p>
        <p className="mt-2 text-small tabular-nums text-muted-foreground">
          {potNgn !== null ? moneyNgn(potNgn) : priceNote || "naira price unavailable"}
        </p>
        <p className="mt-2 text-small text-muted-foreground">
          {paidCount} of {view.rounds} paid · Goes to {recipientName}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(paidCount / Math.max(view.rounds, 1)) * 100}%` }}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-h3 font-bold">Who has paid</h2>
        <ul className="mt-4 space-y-2">
          {view.members.map((m) => (
            <li
              key={m.address}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
            >
              <span className="font-semibold">{m.name || m.address.slice(0, 10)}</span>
              <span
                className={
                  m.paidThisRound
                    ? "text-small font-bold text-success"
                    : "text-small text-muted-foreground"
                }
              >
                {m.paidThisRound ? "Paid" : "Waiting"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <p className="text-micro font-bold uppercase tracking-[0.04em] text-muted-foreground">
          Memories saved on Walrus
        </p>
        <h2 className="mt-2 text-h3 font-bold">Kolo remembers</h2>
        <p className="mt-2 text-small text-muted-foreground">
          Trust is read back from memory, not from the chain. Blob links prove
          storage; content is Seal-encrypted.
        </p>
        <ul className="mt-4 space-y-3">
          {view.members.map((m) => {
            const trust = trustByAddress[m.address];
            const paidRounds = trust ? trust.onTime + trust.late : 0;
            const headline = trust
              ? `Paid on time ${trust.onTime} of ${Math.max(paidRounds, trust.onTime)} rounds`
              : "No memories yet";
            return (
              <li
                key={`trust-${m.address}`}
                className="rounded-2xl border border-border bg-card px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.name || m.address.slice(0, 10)}</p>
                    <p className="mt-1 text-small text-muted-foreground">{headline}</p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-muted-foreground">
                    {trust?.network || "mock"}
                  </span>
                </div>
                {trust && trust.rounds.filter((r) => r.kind === "paid").length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trust.rounds
                      .filter((r) => r.kind === "paid")
                      .map((r) => (
                        <span
                          key={`${r.txDigest}-${r.round}`}
                          className={
                            r.timing === "late"
                              ? "rounded-full bg-warning-soft px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-warning"
                              : "rounded-full bg-success-soft px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-success"
                          }
                          title="Seal-encrypted on Walrus — link proves storage, not plaintext"
                        >
                          R{r.round} {r.timing === "late" ? "late" : "on time"}
                        </span>
                      ))}
                  </div>
                ) : null}
                {trust?.blobIds?.length ? (
                  <ul className="mt-3 space-y-1">
                    {trust.rounds
                      .filter((r) => r.link)
                      .map((r) => (
                        <li key={`blob-${r.txDigest}`}>
                          <a
                            className="text-small font-semibold text-accent underline-offset-2 hover:underline"
                            href={r.link || "#"}
                            target="_blank"
                            rel="noreferrer"
                            title="Seal-encrypted blob — proves storage, plaintext stays private"
                          >
                            stored on Walrus
                          </a>
                        </li>
                      ))}
                  </ul>
                ) : null}
                {trust?.nudge ? (
                  <p className="mt-3 rounded-xl bg-secondary/70 px-3 py-2 text-small text-muted-foreground">
                    {trust.nudge}
                  </p>
                ) : null}
                {trust ? (
                  <p className="mt-2 text-micro text-muted-foreground">
                    source: {trust.source}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-h3 font-bold">Payments</h2>
        {paymentList.length === 0 ? (
          <p className="mt-3 text-small text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {paymentList.map((p, i) => {
              const name =
                view.members.find((m) => m.address === p.member)?.name ||
                saved.members.find((m) => m.name === p.member || m.address === p.member)?.name ||
                p.member;
              const href = "explorerUrl" in p && p.explorerUrl ? p.explorerUrl : "";
              const digest = "txDigest" in p ? p.txDigest : "";
              return (
                <li
                  key={`${p.kind}-${p.round}-${digest || i}`}
                  className="rounded-2xl border border-success/30 bg-success-soft/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">
                      {p.kind === "contributed" ? "Paid in" : "Paid out"} · round {p.round} · {name}
                    </p>
                  </div>
                  {href ? (
                    <a
                      className="mt-2 inline-block text-small font-semibold text-accent underline-offset-2 hover:underline"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Suiscan
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-h3 font-bold">Payout history</h2>
        {view.payouts.length === 0 ? (
          <p className="mt-3 text-small text-muted-foreground">No payouts yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {view.payouts.map((p) => {
              const name =
                view.members.find((m) => m.address === p.recipient)?.name ||
                saved.members.find((m) => m.name === p.recipient || m.address === p.recipient)
                  ?.name ||
                p.recipient;
              return (
                <li
                  key={`${p.round}-${p.txRef}`}
                  className="rounded-2xl border border-success/30 bg-success-soft/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">
                      Round {p.round} · {name}
                    </p>
                    <span className="rounded-full bg-card px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-success">
                      {p.mode === "auto" ? "paid auto" : "paid"}
                    </span>
                  </div>
                  <p className="mt-1 text-small text-muted-foreground tabular-nums">
                    {moneyUsd(p.amountUsd)}
                    {p.amountNgn !== null && p.amountNgn !== undefined
                      ? ` · ${moneyNgn(p.amountNgn)}`
                      : ""}
                  </p>
                  {p.txRef ? (
                    <a
                      className="mt-2 inline-block text-small font-semibold text-accent underline-offset-2 hover:underline"
                      href={`https://suiscan.xyz/testnet/tx/${p.txRef}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View details
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-small text-muted-foreground">
        Testnet demo, testnet USDC only (no real money)
      </p>
    </main>
  );
}
