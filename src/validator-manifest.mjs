export const MAINNET_GENESIS =
  "0x1941ca8e2bb88146c14dea084d3be7eb6e96ca7135429c543848b628124f2854";

export const VALIDATOR_MANIFEST = {
  "aton-validator": {
    organization: "Telegram",
    secondary: "Alpha Compute",
    logo: "telegram.svg",
    accent: "#2aabee",
    priority: 8
  },
  "bgo-validator": {
    organization: "BitGo",
    logo: "bitgo.png",
    accent: "#5df1a1",
    priority: 10
  },
  "bkd-validator-mnf": {
    organization: "Blockdaemon",
    logo: "blockdaemon.png",
    accent: "#745cff",
    priority: 3
  },
  "bkd-validator-bullish": {
    organization: "Bullish",
    logo: "bullish.jpg",
    accent: "#ff7a45",
    priority: 11
  },
  "mnf-validator-1": {
    organization: "Midnight Foundation",
    logo: "midnight-foundation.png",
    accent: "#ffffff",
    priority: 1
  },
  "ktg-validator": {
    organization: "Karatage.io",
    logo: "karatage.png",
    accent: "#e5e7eb",
    priority: 13
  },
  "sfi-validator-google": {
    organization: "Google Cloud",
    logo: "google-cloud.svg",
    accent: "#4285f4",
    priority: 2
  },
  "sfi-validator-moneygram": {
    organization: "MoneyGram",
    logo: "moneygram.svg",
    accent: "#ff3f64",
    priority: 7
  },
  "sfi-validator-vodafone": {
    organization: "Vodafone",
    logo: "vodafone.svg",
    accent: "#e60000",
    priority: 9
  },
  "sfi-validator-worldpay": {
    organization: "Worldpay",
    logo: "worldpay.svg",
    accent: "#ff3d8d",
    priority: 6
  },
  "stl-validator-labrador-monarch": {
    organization: "Shielded Technologies",
    logo: "shielded.jpg",
    accent: "#111111",
    priority: 12
  },
  "stl-validator-whippet-humpback": {
    organization: "Shielded Technologies",
    logo: "shielded.jpg",
    accent: "#111111",
    priority: 12
  },
  "twn-validator-etoro": {
    organization: "eToro",
    logo: "etoro.png",
    accent: "#6bd400",
    priority: 5
  }
};

export function isValidatorAddress(value) {
  return typeof value === "string" && value.length > 20 && value !== "<unknown>";
}

export function mapTelemetryNode(node) {
  if (!isValidatorAddress(node.validator)) return null;
  const brand = VALIDATOR_MANIFEST[node.name] ?? {
    organization: node.name,
    logo: "fallback.svg",
    accent: "#ffffff",
    priority: 99,
    unmapped: true
  };

  return {
    name: node.name,
    ...brand,
    validator: node.validator,
    networkId: node.networkId,
    city: node.city ?? "Location unavailable",
    lat: Number.isFinite(node.lat) ? node.lat : null,
    lon: Number.isFinite(node.lon) ? node.lon : null,
    peers: node.peers ?? null,
    txs: node.txs ?? null,
    height: node.height ?? null,
    blockTimeMs: node.blockTime ?? null,
    propagationMs: node.propagationMs ?? null,
    version: node.version ?? null,
    online: true
  };
}

export function mergeKnownValidators(liveValidators, previousValidators = []) {
  const liveByName = new Map(liveValidators.map((node) => [node.name, node]));
  const previousByName = new Map(previousValidators.map((node) => [node.name, node]));

  for (const [name, brand] of Object.entries(VALIDATOR_MANIFEST)) {
    if (liveByName.has(name)) continue;
    const previous = previousByName.get(name);
    liveByName.set(name, {
      ...(previous ?? {
        name,
        city: "Location unavailable",
        lat: null,
        lon: null,
        validator: null,
        networkId: null,
        peers: null,
        txs: null,
        height: null,
        blockTimeMs: null,
        propagationMs: null,
        version: null
      }),
      ...brand,
      online: false
    });
  }

  return [...liveByName.values()].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.organization.localeCompare(b.organization)
  );
}
