import test from "node:test";
import assert from "node:assert/strict";
import {
  VALIDATOR_MANIFEST,
  isValidatorAddress,
  mapTelemetryNode,
  mergeKnownValidators
} from "../src/validator-manifest.mjs";

test("manifest contains 13 validator nodes", () => {
  assert.equal(Object.keys(VALIDATOR_MANIFEST).length, 13);
});

test("Telegram uses Alpha Compute as secondary name", () => {
  assert.deepEqual(
    {
      organization: VALIDATOR_MANIFEST["aton-validator"].organization,
      secondary: VALIDATOR_MANIFEST["aton-validator"].secondary,
      logo: VALIDATOR_MANIFEST["aton-validator"].logo
    },
    { organization: "Telegram", secondary: "Alpha Compute", logo: "telegram.svg" }
  );
});

test("unknown validator addresses are excluded", () => {
  assert.equal(isValidatorAddress("<unknown>"), false);
  assert.equal(mapTelemetryNode({ name: "sfi-rpc-bcw", validator: "<unknown>" }), null);
});

test("known missing validators remain visible offline", () => {
  const merged = mergeKnownValidators([]);
  assert.equal(merged.length, 13);
  assert.ok(merged.every((node) => node.online === false));
});
