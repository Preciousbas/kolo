import Link from "next/link";
import { KoloLogo } from "@/components/kolo-logo";

export default function CircleNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-16 text-foreground">
      <Link href="/" className="mb-10 self-start active:scale-95" aria-label="Kolo home">
        <KoloLogo variant="lockup" />
      </Link>
      <h1 className="text-h1 font-extrabold">Circle not found</h1>
      <p className="mt-4 text-body text-muted-foreground">
        That circle id is not on Kolo. Check the link, or go home and open the demo.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center self-start rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:scale-95"
      >
        Back home
      </Link>
    </main>
  );
}
