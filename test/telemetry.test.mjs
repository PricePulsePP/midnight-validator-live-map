import test from "node:test";
import assert from "node:assert/strict";
import { nodeFromAddedPayload, parseMessage } from "../src/telemetry.mjs";

test("parses paired telemetry actions", () => {
  assert.deepEqual(parseMessage('[0,33,11,["Mainnet","hash",38]]'), [
    { action: 0, payload: 33 },
    { action: 11, payload: ["Mainnet", "hash", 38] }
  ]);
});

test("parses added node payload", () => {
  const node = nodeFromAddedPayload([
    1,
    ["node", "Midnight Node", "0.22.5", "validator-address-long-enough", "network"],
    [20, 0],
    [0],
    [0, 0, []],
    [100, "hash", 6000, 0, 42],
    [53.2, 6.5, "Groningen"],
    1
  ]);
  assert.equal(node.name, "node");
  assert.equal(node.city, "Groningen");
  assert.equal(node.propagationMs, 42);
});
