import assert from "node:assert/strict";
import test from "node:test";
import { dispatchAssignSchema } from "@/lib/validators";

test("派单允许明确确认 0 元订单", () => {
  assert.equal(
    dispatchAssignSchema.safeParse({
      butlerIds: ["butler-1"],
      settlementAmount: "0",
      amountConfirmed: true
    }).success,
    true
  );
});

test("派单缺少金额或未确认时校验失败", () => {
  assert.equal(
    dispatchAssignSchema.safeParse({ butlerIds: ["butler-1"], amountConfirmed: true }).success,
    false
  );
  assert.equal(
    dispatchAssignSchema.safeParse({
      butlerIds: ["butler-1"],
      settlementAmount: "12.00",
      amountConfirmed: false
    }).success,
    false
  );
  assert.equal(
    dispatchAssignSchema.safeParse({
      butlerIds: ["butler-1"],
      settlementAmount: null,
      amountConfirmed: true
    }).success,
    false
  );
});
