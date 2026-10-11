import test from "node:test";
import assert from "node:assert/strict";
import {
  formatManualFriendly,
  getFriendlyReferences,
} from "../src/utils/nineLineFriendlies.js";

const target = {
  id: "TGT-001",
  type: "enemy",
  position: { lat: 51, lng: -2 },
};

test("mapped friendly units are ordered closest first", () => {
  const references = getFriendlyReferences(
    [
      target,
      { id: "FR-2", type: "friendly", description: "Troop 2", position: { lat: 50.98, lng: -2 } },
      { id: "FR-1", type: "friendly", description: "Troop 1", position: { lat: 50.995, lng: -2 } },
      { id: "NEUTRAL", type: "neutral", position: { lat: 50.999, lng: -2 } },
    ],
    target
  );

  assert.deepEqual(references.map((reference) => reference.id), ["FR-1", "FR-2"]);
  assert.match(references[0].value, /TROOP 1, SOUTH \d+M/);
});

test("manual friendlies format cardinal direction and metres", () => {
  assert.equal(
    formatManualFriendly("SOUTH", "800"),
    "SOUTH 800M"
  );
});
