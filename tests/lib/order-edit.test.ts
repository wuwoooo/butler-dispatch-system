import assert from "node:assert/strict";
import test from "node:test";
import { buildTransportOrderUpdatePayload } from "@/lib/order-edit";

test("交通订单清空标准车型后明确提交 null", () => {
  const payload = buildTransportOrderUpdatePayload({
    hotelId: "hotel-1",
    guestName: "测试客人",
    requestedVehicleType: undefined,
    requestedVehicleInfo: "",
    settlementAmount: "0.00"
  });
  const serialized = JSON.parse(JSON.stringify(payload));

  assert.equal(serialized.requestedVehicleType, null);
  assert.equal(serialized.requestedVehicleInfo, null);
  assert.equal(serialized.settlementAmount, "0.00");
  assert.equal("serviceMode" in serialized, false);
  assert.equal("importFingerprint" in serialized, false);
});

test("交通订单清空收费金额后明确提交 null", () => {
  const payload = buildTransportOrderUpdatePayload({
    hotelId: "hotel-1",
    guestName: "测试客人",
    settlementAmount: ""
  });

  assert.equal(payload.settlementAmount, null);
});
