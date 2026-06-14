import { MAINNET_GENESIS, mapTelemetryNode, mergeKnownValidators } from "./validator-manifest.mjs";

export const TELEMETRY_URL = "wss://telemetry.midnight.network/feed/";

export function parseMessage(data) {
  const decoded = typeof data === "string" ? data : new TextDecoder().decode(data);
  const values = JSON.parse(decoded);
  if (!Array.isArray(values) || values.length === 0 || values.length % 2 !== 0) {
    throw new Error("Invalid telemetry message");
  }
  const messages = [];
  for (let index = 0; index < values.length; index += 2) {
    messages.push({ action: values[index], payload: values[index + 1] });
  }
  return messages;
}

export function nodeFromAddedPayload(payload) {
  const [id, details, stats, , , block, location, startupTime] = payload;
  return {
    id,
    name: details[0],
    implementation: details[1],
    version: details[2],
    validator: details[3],
    networkId: details[4],
    peers: stats?.[0] ?? null,
    txs: stats?.[1] ?? null,
    height: block?.[0] ?? null,
    blockTime: block?.[2] ?? null,
    propagationMs: block?.[4] ?? null,
    lat: location?.[0] ?? null,
    lon: location?.[1] ?? null,
    city: location?.[2] ?? null,
    startupTime
  };
}

export async function collectTelemetry({
  url = TELEMETRY_URL,
  timeoutMs = 25_000,
  previousValidators = []
} = {}) {
  const nodes = new Map();
  let bestBlock = null;
  let finalizedBlock = null;
  let subscribed = false;

  const snapshot = await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => finish(), timeoutMs);

    function finish() {
      clearTimeout(timer);
      socket.close();
      const live = [...nodes.values()].map(mapTelemetryNode).filter(Boolean);
      if (live.length < 8) {
        reject(new Error(`Telemetry returned only ${live.length} valid validators`));
        return;
      }
      resolve({
        generatedAt: new Date().toISOString(),
        source: "https://telemetry.midnight.network/",
        network: "Midnight Mainnet",
        genesisHash: MAINNET_GENESIS,
        bestBlock,
        finalizedBlock,
        validators: mergeKnownValidators(live, previousValidators)
      });
    }

    socket.addEventListener("open", () => socket.send("ping:1"));
    socket.addEventListener("error", () => reject(new Error("Unable to connect to telemetry feed")));
    socket.addEventListener("message", async (event) => {
      const raw =
        event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
      let messages;
      try {
        messages = parseMessage(raw);
      } catch {
        return;
      }

      for (const { action, payload } of messages) {
        if (action === 11 && payload[1] === MAINNET_GENESIS && !subscribed) {
          subscribed = true;
          socket.send(`subscribe:${MAINNET_GENESIS}`);
        } else if (action === 1) {
          bestBlock = payload[0];
        } else if (action === 2) {
          finalizedBlock = payload[0];
        } else if (action === 3) {
          nodes.set(payload[0], nodeFromAddedPayload(payload));
        } else if (action === 4) {
          nodes.delete(payload);
        } else if (action === 5) {
          const [id, lat, lon, city] = payload;
          const node = nodes.get(id);
          if (node) Object.assign(node, { lat, lon, city });
        } else if (action === 6) {
          const [id, block] = payload;
          const node = nodes.get(id);
          if (node) {
            Object.assign(node, {
              height: block[0],
              blockTime: block[2],
              propagationMs: block[4]
            });
          }
        } else if (action === 8) {
          const [id, stats] = payload;
          const node = nodes.get(id);
          if (node) Object.assign(node, { peers: stats[0], txs: stats[1] });
        }
      }

      if (nodes.size >= 38) setTimeout(finish, 800);
    });
  });

  return snapshot;
}
