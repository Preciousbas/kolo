# Kolo

Ajo / esusu rotating savings for the Tatum x Walrus hackathon. Stage 1 is the foundation: a Next.js app, Tatum and MemWal helpers, and a spike Move escrow. Screens are placeholders until HANDOFF.md is applied.

USDC types are testnet and mainnet. The app defaults to testnet. Mainnet stays locked unless `KOLO_NETWORK=mainnet` and `KOLO_ALLOW_MAINNET=yes`. This repo does not publish packages or send transactions.

## Quick start

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

`npm run dev` serves the placeholder screens. `GET /api/health` returns `{ network, tatum, memory }` and never returns secret values.

```bash
npm test
npm run spike:mock
npm run check:secrets
npm run move:test
```

`npm run spike` calls Tatum and MemWal only when the matching env vars are set. With an empty env it prints `SKIP` lines and exits 0. `--mock` runs the MemWal round trip offline.

Move tests need the Sui CLI (`testnet-v1.82.2`). Do not run `sui client publish` from this repo. Publish on testnet yourself and put the package id in `KOLO_PACKAGE_ID`.

## Env

Names only. Values live in `.env` or `.env.local`, and later in Vercel. `.env.example` is the only env file that is committed.

| Name | Kind |
| --- | --- |
| KOLO_NETWORK | public, `testnet` (default) or `mainnet` |
| KOLO_ALLOW_MAINNET | public, must be `yes` to unlock mainnet |
| TATUM_API_KEY | secret |
| TATUM_ID | public |
| MEMWAL_PRIVATE_KEY | secret |
| MEMWAL_ACCOUNT_ID | public |
| MEMWAL_AGENT_ID | public |
| MEMWAL_SERVER_URL | public, optional |
| MEMWAL_NAMESPACE | public |
| KOLO_MEMORY_MOCK | public, `1` forces the mock |
| NEXT_PUBLIC_KOLO_NETWORK | public |
| KOLO_PACKAGE_ID | public, after testnet publish |
| SUI_ADDRESS | public |
| CRON_SECRET | secret |
| LLM_API_KEY | secret, unused in stage 1 |

## How Kolo uses Tatum

All chain reads go through Tatum first. Writes stay out of this stage (prompt 3 is read-only).

| Interface | Endpoint / method | Why |
| --- | --- | --- |
| GraphQL | `https://sui-{network}.gateway.tatum.io/graphql` — `events(filter:{type})`, `object(address)`, `address{balance}`, `checkpoint` | Primary read path. Indexed events and object JSON for circle state, contributions, and payouts. |
| gRPC | `https://sui-{network}-grpc.gateway.tatum.io` — `LedgerService/GetObject`, `StateService/GetBalance`, `GetCheckpoint` / chain id | Fast object and balance reads when GraphQL misses. Auth via `x-api-key` metadata. |
| JSON-RPC | `https://sui-{network}.gateway.tatum.io` — legacy `sui_*` | Tried last. Testnet returns 404 after the [JSON-RPC EOL notice](https://docs.tatum.io/changelog/sui-json-rpc-migration-notice). |
| Price | `GET https://api.tatum.io/v4/data/rate/symbol?symbol=USDC&basePair=NGN` (also SUI) | Pot and payouts in naira. Cached 5 minutes (~20 credits/call). |
| Fallback | Public Sui GraphQL / fullnode | Only if every Tatum path fails. Responses always include `via`. |

Docs used while building:

- [Tatum Sui](https://tatum.io/chain/sui) · [Building on Sui](https://tatum.io/blog/building-on-sui)
- [JSON-RPC migration notice](https://docs.tatum.io/changelog/sui-json-rpc-migration-notice)
- [gRPC reference](https://docs.tatum.io/reference/sui-grpc) · [Migration guide](https://docs.tatum.io/docs/sui-migration-guide-from-json-rpc-to-grpc)
- Gateway `/_methods` and `/llms.txt` (recorded in `docs/tatum-methods.md`)
- [AI Builder](https://ai.tatum.io) · [agent manifest](https://ai.tatum.io/.well-known/tatum-agent.json)
- [Sui GraphQL](https://docs.sui.io/references/sui-graphql)

Credit budget: free plan ~100K lifetime, ≤3 req/s. Chain reads cached 15s; prices 5 min. `npm run smoke:tatum` probes the live gateways on testnet only.

## How Kolo uses Walrus Memory

After every contribution or payout event, Kolo writes one small JSON memory to Walrus Memory (MemWal). The trust panel on `/circles/demo` (“Kolo remembers”) is read back from memory via `recall`, not from the chain.

### What one memory holds

`KoloMemory` (`v: 1`, `app: "kolo"`) stores: `kind` (`paid` | `paid_out`), `circleId`, `round`, `member` (Sui address only — never a personal name), `timing` (`on_time` | `late` | `null` for payouts), `amountRaw`, `coinType`, `decimals`, ISO `at`, escrow `txDigest`, and `escrowNetwork: "testnet"`. The text sent to MemWal is a short sentence plus the JSON, e.g. `Kolo: member 0xab..cd paid round 3 of circle 0x12..34 on time. {json}`.

Names from `data/demo-circle.json`, emails, and phone patterns are rejected before write.

### Namespace and links

Namespace is `kolo:<circleId>`. Each successful write records `blob_id` in `data/memory-ledger.<testnet|mainnet>.json` with a Walruscan link (`https://walruscan.com/<network>/blob/<blobId>`). Blobs are Seal-encrypted — the link proves storage, not plaintext.

### Trust view and nudge

`getMemberTrust` calls `recall({ query: "payments by <member> in circle <circleId>", namespace, limit: 20 })`, parses JSON from each hit, keeps that member, dedupes by `txDigest`, and returns on-time / late counts plus blob links (`source: "memory"`). If recall fails, it falls back to the ledger / feed (`source: "ledger"`). The panel shows a learning-loop nudge from memory (text only in this stage), e.g. late payers get an earlier-reminder line.

### Mainnet switch and cost cap

Escrow `KOLO_NETWORK` stays testnet. Memory network is separate: `memoryNetwork()` returns testnet unless `KOLO_MEMORY_NETWORK=mainnet` and `KOLO_ALLOW_MAINNET_MEMORY=yes`. Relayers: testnet `https://relayer.dev.memwal.ai`, mainnet `https://relayer.memory.walrus.xyz` (`MEMWAL_SERVER_URL` overrides). Caps: `KOLO_MEMORY_MAX_TOTAL` (default 20) and `KOLO_MEMORY_MAX_PER_RUN` (default 12). `npm run memory:demo` is dry-run by default; `--write` is required; mainnet also needs `--yes-mainnet` and typing `MAINNET`.

Docs: [MemWal API reference](https://docs.wal.app/walrus-memory/sdk/api-reference) · [versioned datasets / blob IDs](https://github.com/MystenLabs/MemWal/blob/dev/docs/sdk/versioned-datasets.md) · [hackathon rules](https://thewalrussessions.wal.app/tatum-total-recall/index.html)

## Hard rules

- Secrets stay in env vars. Do not hard-code, log, or print them. Print `set` or `missing` only.
- Commit `.env.example` only. No other `.env*` file.
- Commit messages are plain conventional commits. No co-author trailer, no "Made with Cursor".
- The commit hook lives in `.githooks/commit-msg`. Do not remove it, do not change `core.hooksPath`, and do not add Husky.
- Testnet only. No mainnet transactions. No deploys and no pushes unless you ask for them in chat.
- Do not create accounts, buy anything, or call faucets from the agent.

## Design tokens

Studio's zip (Drive file `1NK0TE7VNnOjy9_jAHxoZyzBfL0o7_Ujb`) returned Access denied, so `design/kolo-tokens.css`, `design/tailwind.kolo.js`, and `design/brand/final` are not in this tree. Placeholder screens use Plus Jakarta Sans. Copy the Studio files into `design/` before prompt 7 and replace the placeholder colours with those tokens. Do not invent a brand palette on top of them.

## UNCONFIRMED

- Tatum testnet JSON-RPC may 404 even with a key. `latestCheckpoint()` tries JSON-RPC, then GraphQL.
- The Price API response shape is parsed defensively. `symbol=USDC` may not return a value.
- Sui CLI archive name used in CI: `sui-testnet-v1.82.2-ubuntu-x86_64.tgz` (listed on that GitHub release). The tarball layout is discovered with `find`.
- Move.toml uses `edition = "2024.beta"` because that is the edition in the `testnet-v1.82.2` example packages.
