# Midnight Validator Live Map

A dark, Europe-focused live globe for Midnight Mainnet validators.

The site reads a validated static snapshot generated from Midnight's public
telemetry WebSocket feed. GitHub Actions refreshes and deploys the snapshot
hourly without API keys or repository secrets.

## Trigger a refresh from Linux

Create a fine-grained GitHub token for this repository with **Actions:
Read and write** permission, then install and run the trigger script:

```bash
chmod +x scripts/trigger-daily-refresh.sh
export GITHUB_TOKEN="github_pat_..."
./scripts/trigger-daily-refresh.sh
```

Example daily cron entry, running at 06:10 local server time:

```cron
10 6 * * * GITHUB_TOKEN=github_pat_... /absolute/path/midnight-validator-live-map/scripts/trigger-daily-refresh.sh >> /var/log/midnight-validator-refresh.log 2>&1
```

The script defaults to `PricePulsePP/midnight-validator-live-map`, workflow
`deploy.yml`, and branch `main`. Override them with `GITHUB_OWNER`,
`GITHUB_REPO`, `GITHUB_WORKFLOW`, or `GITHUB_REF`.

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
