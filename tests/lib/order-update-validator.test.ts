import assert from "node:assert/strict";
import test from "node:test";
import {
  orderImportCommitSelectionSchema,
  orderUpdateSchema
} from "@/lib/validators";

test("交通订单编辑允许四类接送组合所需字段和 0 元收费", () => {
  for (const pickupType of ["airport", "train"] as const) {
    for (const transportDirection of ["pickup", "dropoff"] as const) {
      const result = orderUpdateSchema.safeParse({
        pickupType,
        transportDirection,
        serviceStartAt: "2026-07-17T06:00:00.000Z",
        serviceEndAt: "2026-07-17T09:00:00.000Z",
        settlementAmount: "0.00"
      });
      assert.equal(result.success, true);
    }
  }
});

test("交通订单编辑允许将收费金额置空", () => {
  assert.equal(
    orderUpdateSchema.safeParse({ settlementAmount: null }).success,
    true
  );
});

test("导入提交允许空收费并接收可编辑的接送字段", () => {
  const result = orderImportCommitSelectionSchema.safeParse({
    rows: [
      {
        sourceSheet: "订单",
        sourceRow: 2,
        guestPhone: "13800000000",
        pickupType: "train",
        transportDirection: "dropoff",
        arrivalStation: "大理站",
        serviceEndAt: "2026-07-17T09:00:00.000Z",
        settlementAmount: null
      }
    ]
  });

  assert.equal(result.success, true);
});

test("交通订单编辑拒绝非法金额和倒置服务时段", () => {
  assert.equal(
    orderUpdateSchema.safeParse({ settlementAmount: "-1.00" }).success,
    false
  );
  assert.equal(
    orderUpdateSchema.safeParse({ settlementAmount: "12.345" }).success,
    false
  );
  assert.equal(
    orderUpdateSchema.safeParse({
      serviceStartAt: "2026-07-17T09:00:00.000Z",
      serviceEndAt: "2026-07-17T06:00:00.000Z"
    }).success,
    false
  );
});
