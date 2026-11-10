import Link from "next/link";
import { KoloLogo } from "@/components/kolo-logo";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 0%, #F7E3D6 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 20%, #E4EAF4 0%, transparent 50%)",
        }}
      />
      <div className="relative">
        <KoloLogo variant="lockup" className="h-12 w-auto" priority />
        <h1 className="mt-10 text-display font-extrabold tracking-tight">
          Save together. Get paid on your turn.
        </h1>
        <p className="mt-4 max-w-md text-body text-muted-foreground">
          Run your ajo, esusu or family contribution in one place. Kolo tracks who has paid and pays
          out the pot when it is full.
        </p>
        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/circles/demo"
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground transition hover:scale-95 active:scale-90"
          >
            Open the demo circle
          </Link>
          <Link
            href="/circles"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-card px-6 text-sm font-semibold transition hover:scale-95"
          >
            Circles
          </Link>
        </div>
        <p className="mt-8 text-small text-muted-foreground">
          Testnet demo, testnet USDC only (no real money)
        </p>
      </div>
    </main>
  );
}
