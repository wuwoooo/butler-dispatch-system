import assert from "node:assert/strict";
import test from "node:test";
import { getOrderServiceWindow, timeWindowsOverlap } from "@/lib/order-conflicts";

test("交通订单使用精确三小时服务窗口", () => {
  const window = getOrderServiceWindow({
    serviceStartAt: new Date("2026-07-17T14:00:00+08:00"),
    serviceEndAt: new Date("2026-07-17T17:00:00+08:00"),
    arrivalTime: new Date("2026-07-17T14:00:00+08:00"),
    checkInDate: new Date("2026-07-17T00:00:00+08:00"),
    checkOutDate: new Date("2026-07-17T17:00:00+08:00")
  });
  assert.equal(window.startAt.toISOString(), "2026-07-17T06:00:00.000Z");
  assert.equal(window.endAt.toISOString(), "2026-07-17T09:00:00.000Z");
  assert.equal(
    timeWindowsOverlap(window, {
      startAt: new Date("2026-07-17T17:30:00+08:00"),
      endAt: new Date("2026-07-17T19:00:00+08:00")
    }),
    false
  );
  assert.equal(
    timeWindowsOverlap(window, {
      startAt: new Date("2026-07-17T16:30:00+08:00"),
      endAt: new Date("2026-07-17T18:00:00+08:00")
    }),
    true
  );
});
