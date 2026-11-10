export default function TermsPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-h1 font-extrabold">Terms of use</h1>
      <p className="mt-4 text-body text-muted-foreground">Kolo is a testnet beta. It is not a bank, not a payment service, and not an offer of financial services.</p>
      <p className="mt-4 text-body">You use Kolo on Sui testnet only. Testnet USDC has no cash value. Do not send mainnet assets or recovery phrases to Kolo.</p>
      <p className="mt-4 text-body">Members move money only by signing in their own wallet. Kolo does not hold keys or seed phrases. Circle payouts follow the on-chain contract you signed up to.</p>
      <p className="mt-4 text-body">This beta can change, break, or reset. By continuing you accept that risk.</p>
    </main>
  );
}
