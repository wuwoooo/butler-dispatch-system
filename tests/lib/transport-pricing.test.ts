import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultTransportFee,
  getDefaultTransportFeeText,
  getDefaultTransportFeesByVehicleType,
  getDefaultTransportFeeTotalText
} from "@/lib/transport-pricing";

test("商务车机场和车站默认收费分别为 130、80", () => {
  assert.equal(getDefaultTransportFee({ pickupType: "airport", vehicleType: "business" }), 130);
  assert.equal(getDefaultTransportFee({ pickupType: "train", vehicleType: "business" }), 80);
});

test("轿车和 SUV 均按小车默认收费", () => {
  for (const vehicleType of ["sedan", "suv"] as const) {
    assert.equal(getDefaultTransportFee({ pickupType: "airport", vehicleType }), 100);
    assert.equal(getDefaultTransportFeeText({ pickupType: "train", vehicleType }), "60.00");
  }
});

test("可派管家接口使用的车型收费表覆盖三种车型", () => {
  assert.deepEqual(getDefaultTransportFeesByVehicleType("airport"), {
    sedan: "100.00",
    suv: "100.00",
    business: "130.00"
  });
  assert.deepEqual(getDefaultTransportFeesByVehicleType("train"), {
    sedan: "60.00",
    suv: "60.00",
    business: "80.00"
  });
});

test("多管家派单按每辆车的默认价格求和", () => {
  assert.equal(
    getDefaultTransportFeeTotalText({
      pickupType: "airport",
      selectedVehicleTypes: ["sedan", "business"],
      fallbackVehicleType: "sedan"
    }),
    "230.00"
  );
  assert.equal(
    getDefaultTransportFeeTotalText({
      pickupType: "train",
      selectedVehicleTypes: ["suv", "sedan"],
      fallbackVehicleType: "business"
    }),
    "120.00"
  );
  assert.equal(
    getDefaultTransportFeeTotalText({
      pickupType: "airport",
      selectedVehicleTypes: ["business", "business"],
      fallbackVehicleType: "sedan"
    }),
    "260.00"
  );
  assert.equal(
    getDefaultTransportFeeTotalText({
      pickupType: "train",
      selectedVehicleTypes: [null],
      fallbackVehicleType: "business"
    }),
    "80.00"
  );
});
