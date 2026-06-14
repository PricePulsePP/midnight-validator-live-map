# Midnight Validator Live Map

A dark, Europe-focused live globe for Midnight Mainnet validators.

The site reads a validated static snapshot generated from Midnight's public
telemetry WebSocket feed. GitHub Actions refreshes and deploys the snapshot
hourly without API keys or repository secrets.

## Local use

```bash
npm install
npm test
npm run refresh
npm run dev
```

## Data source

- Telemetry UI: https://telemetry.midnight.network/
- Public feed: `wss://telemetry.midnight.network/feed/`

Only telemetry nodes with a valid validator address are included. RPC, bridge,
boot, filter, standby, and unknown-address nodes are excluded.
