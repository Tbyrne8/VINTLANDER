import test from "node:test";
import assert from "node:assert/strict";
import { formatMgrsValue } from "../src/utils/mgrs.js";

test("compact MGRS grids are spaced for attack briefs", () => {
  assert.equal(formatMgrsValue("30UWB6856974674"), "30U WB 68569 74674");
});

test("already spaced MGRS grids retain standard spacing", () => {
  assert.equal(formatMgrsValue("30u wb 68569 74674"), "30U WB 68569 74674");
});
