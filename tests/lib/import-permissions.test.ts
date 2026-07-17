import assert from "node:assert/strict";
import test from "node:test";
import { canImportHotelRooms, canImportOrders } from "@/lib/permissions";

test("仅管理员和酒店前台可批量导入订单", () => {
  assert.equal(canImportOrders({ roleCode: "admin" }), true);
  assert.equal(canImportOrders({ roleCode: "hotel_frontdesk" }), true);
  assert.equal(canImportOrders({ roleCode: "dispatcher" }), false);
  assert.equal(canImportOrders({ roleCode: "butler" }), false);
  assert.equal(canImportOrders({ roleCode: "finance" }), false);
});

test("仅管理员可批量导入酒店房型和房号", () => {
  assert.equal(canImportHotelRooms({ roleCode: "admin" }), true);
  assert.equal(canImportHotelRooms({ roleCode: "hotel_frontdesk" }), false);
  assert.equal(canImportHotelRooms({ roleCode: "dispatcher" }), false);
  assert.equal(canImportHotelRooms({ roleCode: "butler" }), false);
  assert.equal(canImportHotelRooms({ roleCode: "finance" }), false);
});
