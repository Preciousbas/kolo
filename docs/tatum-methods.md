# Tatum Sui testnet gateway methods

Fetched from Tatum's gateway `_methods` endpoints (API key via `x-api-key` header; key not stored here):
`https://sui-testnet.gateway.tatum.io/_methods` and
`https://sui-testnet-grpc.gateway.tatum.io/_methods`.

Also see `https://sui-testnet.gateway.tatum.io/llms.txt`.

Kolo's primary read path is **Tatum GraphQL** at `https://sui-testnet.gateway.tatum.io/graphql`
(not the public Sui GraphQL host). `/api/health` reports GraphQL status and marks gRPC as optional/`skipped`.

## HTTP gateway (`sui-testnet.gateway.tatum.io`)

```json
{
  "sui-testnet-graphql": {
    "url": "https://sui-testnet.gateway.tatum.io/graphql",
    "protocol": "GraphQL",
    "methods": ["mutation", "query"]
  }
}
```

JSON-RPC on this host returns HTTP 404 (EOL migration; see Tatum changelog).

## gRPC gateway (`sui-testnet-grpc.gateway.tatum.io`) — optional

```json
{
  "sui-testnet-grpc": {
    "url": "https://sui-testnet-grpc.gateway.tatum.io",
    "protocol": "gRPC",
    "methods": [
      "grpc.reflection.v1.ServerReflection/ServerReflectionInfo",
      "grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo",
      "sui.rpc.v2.CheckpointSummaryService/GetCheckpointSummary",
      "sui.rpc.v2.CheckpointSummaryService/ListCheckpointSummaries",
      "sui.rpc.v2.LedgerService/BatchGetObjects",
      "sui.rpc.v2.LedgerService/BatchGetTransactions",
      "sui.rpc.v2.LedgerService/GetCheckpoint",
      "sui.rpc.v2.LedgerService/GetEpoch",
      "sui.rpc.v2.LedgerService/GetObject",
      "sui.rpc.v2.LedgerService/GetServiceInfo",
      "sui.rpc.v2.LedgerService/GetTransaction",
      "sui.rpc.v2.LedgerService/ListCheckpoints",
      "sui.rpc.v2.LedgerService/ListTransactions",
      "sui.rpc.v2.MovePackageService/GetDatatype",
      "sui.rpc.v2.MovePackageService/GetFunction",
      "sui.rpc.v2.MovePackageService/GetPackage",
      "sui.rpc.v2.MovePackageService/ListPackageVersions",
      "sui.rpc.v2.NameService/LookupName",
      "sui.rpc.v2.NameService/ReverseLookupName",
      "sui.rpc.v2.SignatureVerificationService/VerifySignature",
      "sui.rpc.v2.StateService/GetBalance",
      "sui.rpc.v2.StateService/GetCoinInfo",
      "sui.rpc.v2.StateService/ListBalances",
      "sui.rpc.v2.StateService/ListDynamicFields",
      "sui.rpc.v2.StateService/ListOwnedObjects",
      "sui.rpc.v2.SubscriptionService/SubscribeCheckpoints",
      "sui.rpc.v2.TransactionExecutionService/ExecuteTransaction",
      "sui.rpc.v2.TransactionExecutionService/SimulateTransaction"
    ]
  }
}
```

## Notes

- Auth for both gateways: `x-api-key` header (gRPC: metadata).
- GraphQL schema for events filter uses `EventFilter.type` (confirmed against public Sui GraphQL introspection).
- Price quotes use `GET https://api.tatum.io/v4/data/rate/symbol?symbol=...&basePair=NGN` (separate from the chain gateway).
