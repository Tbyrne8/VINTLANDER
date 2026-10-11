import test from "node:test";
import assert from "node:assert/strict";
import {
  getTargetDescription,
  getTargetOptionLabel,
} from "../src/utils/targetDescription.js";

test("self-led targets display only their target name", () => {
  const target = {
    id: "TGT-001",
    type: "enemy",
    description: "Enemy position for self-led target development",
    source: "SELF-LED AUTO",
  };

  assert.equal(getTargetDescription(target), "TGT-001");
  assert.equal(getTargetOptionLabel(target), "TGT-001");
});

test("manually described targets retain their description", () => {
  const target = {
    id: "TGT-002",
    type: "enemy",
    description: "Armoured vehicle",
  };

  assert.equal(getTargetDescription(target), "enemy - Armoured vehicle");
  assert.equal(getTargetOptionLabel(target), "TGT-002 - enemy - Armoured vehicle");
});
