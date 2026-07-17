import assert from "node:assert/strict";
import test from "node:test";
import { utils, write } from "xlsx";
import {
  buildHotelRoomImportPlan,
  parseHotelRoomImportWorkbook
} from "@/lib/hotel-room-import";

const sampleRows = [
  ["房型"],
  [],
  ["房型代码", "PMS房型名称", "CRS房型名称", "各房型数量", "说明"],
  ["GVK", "星栖·露台大床房Terrace King Bed", "-", 8, "标准大床房。\n房间分布：遇-3栋（101、102）；洱-5栋（101）；情-17栋（201、202、203）；缘-18栋（201、202）"],
  ["GVT", "雪霁·庭院双床房Garden View Twin Bed", "-", 18, "标准双床房。\n房间分布：云-10栋（101、102、103）、麓-11栋（101、102、103）、岚-12栋（101、102、103）、山-13栋（101、102、103）、情-17栋（101、102、103）、缘-18栋（101、102、103）"],
  ["SDK", "月泊·山海露台大床房Mountain and Sea Terrace King Bed", "-", 15, "山海露台大床房。\n房间分布：洱-5栋（102、201、202）；遇-3栋（201、202）；苍-7栋（201、202、203）；阙-8栋（201、202、203）；玉-9栋（201、202、203）；缘-18栋（203）"],
  ["SFS", "云镜·山海亲子套房Mountain and Sea View Deluxe Family Suite", "-", 8, "亲子套房。\n房间分布：辉-6栋（101、102）；苍-7栋（101、102）；阙-8栋（101、102）；玉-9栋（101、102）"],
  ["SDS", "玺悦·山海套房Mountain and Sea View Deluxe Suite", "-", 10, "豪华山海套房。\n房间分布：辉-6栋（201）；苍-7栋（301）；阙-8栋（301）；玉-9栋（301）；云-10栋（201）；麓-11栋（201）；岚-12栋（201）；山-13栋（201）；情-17栋（301）；缘-18栋（301）"],
  ["PS", "御璟·王宫别墅President Villa", "-", 2, "独栋王宫别墅。\n房间分布：御隐-15栋（101、201、202）；璟宸-16栋（101、201、202）"]
];

function workbookFromRows(rows: unknown[][]) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "2026最新房型资料");
  return write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

test("按样表解析 6 个房型和 61 个可售客房单元", () => {
  const parsed = parseHotelRoomImportWorkbook(
    workbookFromRows(sampleRows),
    "大理王宫酒店-2026年客房房型.xlsx"
  );
  assert.equal(parsed.sheetErrors.length, 0);
  assert.equal(parsed.roomTypes.length, 6);
  assert.equal(
    parsed.roomTypes.reduce((sum, item) => sum + item.rooms.length, 0),
    61
  );
  assert.equal(parsed.roomTypes.flatMap((item) => item.errors).length, 0);
  assert.ok(parsed.roomTypes[0].rooms.some((room) => room.roomNo === "遇-3栋-101"));
});

test("别墅按楼栋作为可售单元并保留内部房号", () => {
  const parsed = parseHotelRoomImportWorkbook(workbookFromRows(sampleRows), "rooms.xlsx");
  const villa = parsed.roomTypes.find((item) => item.code === "PS")!;
  assert.deepEqual(
    villa.rooms.map((room) => room.roomNo),
    ["御隐-15栋", "璟宸-16栋"]
  );
  assert.equal(villa.rooms[0].remark, "内部房号：101、201、202");
  assert.match(villa.warnings.join("；"), /按 2 个楼栋单元导入/);
});

test("声明数与房号数、楼栋数均不匹配时阻止导入", () => {
  const rows = [
    ["房型代码", "PMS房型名称", "CRS房型名称", "各房型数量", "说明"],
    ["BAD", "错误房型", "-", 3, "房间分布：甲栋（101、102）"]
  ];
  const parsed = parseHotelRoomImportWorkbook(workbookFromRows(rows), "rooms.xlsx");
  assert.match(parsed.roomTypes[0].errors.join("；"), /无法确定可售单元/);
});

test("计划对重复导入保持幂等，并阻止代码与名称交叉匹配", () => {
  const parsed = parseHotelRoomImportWorkbook(
    workbookFromRows(sampleRows.slice(0, 4)),
    "rooms.xlsx"
  );
  const source = parsed.roomTypes[0];
  const existingType = {
    id: "type-1",
    code: source.code,
    name: source.name,
    sort: 1,
    enabled: true,
    remark: source.remark
  };
  const existingRooms = source.rooms.map((room, index) => ({
    id: `room-${index}`,
    roomNo: room.roomNo,
    roomTypeId: "type-1",
    enabled: true,
    remark: room.remark
  }));
  const idempotent = buildHotelRoomImportPlan(parsed, [existingType], existingRooms);
  assert.equal(idempotent.summary.roomTypes.unchanged, 1);
  assert.equal(idempotent.summary.rooms.unchanged, 8);

  const conflict = buildHotelRoomImportPlan(
    parsed,
    [
      { ...existingType, name: "同代码旧房型名" },
      { ...existingType, id: "type-2", code: "OTHER", name: source.name }
    ],
    existingRooms
  );
  assert.ok(conflict.errors.length > 0);
});

test("拒绝非 Excel 扩展名", () => {
  assert.throws(
    () => parseHotelRoomImportWorkbook(workbookFromRows(sampleRows), "rooms.csv"),
    /仅支持/
  );
});
