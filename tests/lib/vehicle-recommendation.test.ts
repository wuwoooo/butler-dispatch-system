import assert from "node:assert/strict";
import test from "node:test";
import {
  detectVehicleType,
  recommendVehicleTypeByGuestCount,
  resolveRecommendedVehicle,
  sortVehicleRecommendationCandidates
} from "@/lib/vehicle-recommendation";

test("按人数推荐轿车、SUV 和商务车", () => {
  assert.equal(recommendVehicleTypeByGuestCount(3), "sedan");
  assert.equal(recommendVehicleTypeByGuestCount(4), "suv");
  assert.equal(recommendVehicleTypeByGuestCount(5), "business");
});

test("能识别的原表车型优先于人数规则", () => {
  assert.equal(detectVehicleType("丰田大霸王商务车"), "business");
  assert.equal(detectVehicleType("豪华 SUV"), "suv");
  assert.equal(detectVehicleType("轿车"), "sedan");
  assert.equal(detectVehicleType("小车"), "sedan");
  assert.deepEqual(
    resolveRecommendedVehicle({ guestCount: 1, requestedVehicleType: "business" }),
    { vehicleType: "business", source: "order_request" }
  );
});

test("无法识别的车型保持空值", () => {
  assert.equal(detectVehicleType("临时用车"), null);
  assert.equal(detectVehicleType("普通 7 座车"), null);
  assert.equal(detectVehicleType("7 座 SUV"), "suv");
});

test("可用且匹配的管家置前，不可用管家始终在最后", () => {
  const sorted = sortVehicleRecommendationCandidates([
    { id: "unavailable-match", available: false, recommended: true },
    { id: "available-other", available: true, recommended: false },
    { id: "available-match", available: true, recommended: true },
    { id: "unavailable-other", available: false, recommended: false }
  ]);
  assert.deepEqual(sorted.map((item) => item.id), [
    "available-match",
    "available-other",
    "unavailable-match",
    "unavailable-other"
  ]);
});
