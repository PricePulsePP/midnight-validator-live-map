import { readFile, writeFile } from "node:fs/promises";
import { collectTelemetry } from "../src/telemetry.mjs";

const snapshotPath = new URL("../site/validators.json", import.meta.url);
let previous = [];
try {
  previous = JSON.parse(await readFile(snapshotPath, "utf8")).validators ?? [];
} catch {}

const snapshot = await collectTelemetry({ previousValidators: previous });
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${snapshot.validators.length} validators at ${snapshot.generatedAt}`);
