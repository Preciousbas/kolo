export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-h1 font-extrabold">Privacy notice</h1>
      <p className="mt-4 text-body text-muted-foreground">Kolo is a testnet beta.</p>
      <p className="mt-4 text-body">
        Circle addresses, amounts and payouts are public on the Sui blockchain. Anyone can read them on a testnet explorer.
      </p>
      <p className="mt-4 text-body">
        Names are not stored on-chain. Your first and last name stay on Kolo&apos;s profile store and are never shown to other users. Circle members only see your display name.
      </p>
      <p className="mt-4 text-body">
        If you continue with Google, Enoki uses your Google account to create a wallet. Kolo does not copy your Google name or email into your profile.
      </p>
    </main>
  );
}
