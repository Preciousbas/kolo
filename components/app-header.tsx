import Link from "next/link";
import { AccountChip } from "@/components/account-chip";
import type { AuthMethod } from "@/lib/profile";

export function AppHeader({
  title,
  subtitle,
  displayName,
  address,
  authMethod,
  walletName,
}: {
  title: string;
  subtitle?: string;
  displayName: string;
  address: string;
  authMethod: AuthMethod;
  walletName?: string;
}) {
  return (
    <header className="relative flex h-16 items-center gap-3 px-5">
      <Link href="/circles" className="text-h3 font-bold">
        {title}
      </Link>
      {subtitle ? <span className="flex-1 text-small text-muted-foreground">{subtitle}</span> : <span className="flex-1" />}
      <AccountChip displayName={displayName} address={address} authMethod={authMethod} walletName={walletName} />
    </header>
  );
}
