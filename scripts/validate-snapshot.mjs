import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(
  await readFile(new URL("../site/validators.json", import.meta.url), "utf8")
);
if (!snapshot.generatedAt || !Array.isArray(snapshot.validators)) {
  throw new Error("Invalid validator snapshot");
}
if (snapshot.validators.length < 13) {
  throw new Error(`Expected at least 13 known validators, found ${snapshot.validators.length}`);
}
const names = new Set(snapshot.validators.map((node) => node.name));
for (const required of ["aton-validator", "sfi-validator-google", "bkd-validator-mnf"]) {
  if (!names.has(required)) throw new Error(`Missing required validator: ${required}`);
}
if (names.has("sfi-rpc-bcw")) throw new Error("RPC node BCW must not be included");
console.log(`Validated ${snapshot.validators.length} validators`);
