import assert from "node:assert/strict";
import test from "node:test";
import { utils, write } from "xlsx";
import {
  createImportFingerprint,
  detectPickupTypeFromLocation,
  parseOrderImportWorkbook
} from "@/lib/order-import";

function createWorkbook(bookType: "biff8" | "xlsx") {
  const workbook = utils.book_new();
  const rows = [
    [null, "测试酒店"],
    [null, null, "交通服务查询表-接送机"],
    [null, "接送类型：", null, "离开送机"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["0101", "S", "甲客人", 1, 13800000001, "机场", new Date("2026-07-17T06:00:00.000Z"), "别克商务车", 0, "测试单"],
    ["0102", "D", "乙客人", 4, "13800000002", "机场", new Date("2026-07-17T08:00:00.000Z"), "临时用车", "88.50", null],
    [null, null, "人数：", 5],
    [null, null, null, null, null, null, null, null, null, "Page (1/1)"]
  ];
  const sheet = utils.aoa_to_sheet(rows, { cellDates: true });
  sheet["!merges"] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 9 } }
  ];
  utils.book_append_sheet(workbook, sheet, "report ");
  const ignored = utils.aoa_to_sheet([["其他报表"]]);
  utils.book_append_sheet(workbook, ignored, "ignored");
  return write(workbook, { type: "array", bookType }) as ArrayBuffer;
}

for (const [bookType, fileName] of [
  ["biff8", "orders.xls"],
  ["xlsx", "orders.xlsx"]
] as const) {
  test(`解析脱敏 ${fileName} 并忽略页脚`, () => {
    const parsed = parseOrderImportWorkbook(createWorkbook(bookType), fileName);
    assert.equal(parsed.sheetErrors.length, 0);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].sourceHotelName, "测试酒店");
    assert.equal(parsed.rows[0].pickupType, "airport");
    assert.equal(parsed.rows[0].transportDirection, "dropoff");
    assert.equal(parsed.rows[0].requestedVehicleType, "business");
    assert.equal(parsed.rows[0].recommendedVehicleType, "business");
    assert.equal(parsed.rows[0].settlementAmount, "0.00");
    assert.equal(parsed.rows[0].guestPhone, "13800000001");
    assert.equal(
      new Date(parsed.rows[0].serviceEndAt!).getTime() -
        new Date(parsed.rows[0].serviceStartAt!).getTime(),
      3 * 60 * 60 * 1000
    );
    assert.equal(parsed.rows[1].requestedVehicleType, null);
    assert.equal(parsed.rows[1].recommendedVehicleType, "suv");
    assert.equal(parsed.rows[1].warnings.length, 1);
  });
}

test("收费为空时保持空值", () => {
  const workbook = utils.book_new();
  const airportSheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["接机"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "商务客人", 5, "13800000001", "大理凤仪机场", new Date("2026-07-17T06:00:00.000Z"), "GL8", "", ""]
  ]);
  const trainSheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["接站"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["B1", "S", "小车客人", 4, "13800000002", "大理站", new Date("2026-07-17T08:00:00.000Z"), "", null, ""]
  ]);
  utils.book_append_sheet(workbook, airportSheet, "接机表");
  utils.book_append_sheet(workbook, trainSheet, "接站表");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "default-fees.xlsx");

  assert.equal(parsed.rows[0].settlementAmount, null);
  assert.equal(parsed.rows[1].recommendedVehicleType, "suv");
  assert.equal(parsed.rows[1].settlementAmount, null);
  assert.doesNotMatch(parsed.rows[0].warnings.join("；"), /默认值/);
  assert.equal(parsed.rows.flatMap((row) => row.errors).length, 0);
});

test("导入指纹对秒和毫秒做归一化", () => {
  const base = {
    hotelId: "hotel-1",
    transportDirection: "dropoff" as const,
    pickupType: "airport" as const,
    guestPhone: "13800000001",
    roomNo: "0101"
  };
  assert.equal(
    createImportFingerprint({ ...base, serviceStartAt: "2026-07-17T06:00:10.000Z" }),
    createImportFingerprint({ ...base, serviceStartAt: "2026-07-17T06:00:59.999Z" })
  );
});

test("扫描所有可见且包含目标表头的工作表", () => {
  const workbook = utils.book_new();
  const createSheet = (name: string) =>
    utils.aoa_to_sheet([
      ["测试酒店"],
      ["接站"],
      ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
      [name, "S", `${name}客人`, 3, "13800000001", "车站", new Date("2026-07-17T06:00:00.000Z"), "", 10, ""]
    ]);
  utils.book_append_sheet(workbook, createSheet("A"), "可见一");
  utils.book_append_sheet(workbook, createSheet("B"), "可见二");
  utils.book_append_sheet(workbook, createSheet("C"), "隐藏");
  workbook.Workbook = { Sheets: [{ name: "可见一", Hidden: 0 }, { name: "可见二", Hidden: 0 }, { name: "隐藏", Hidden: 1 }] };

  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "multi.xlsx");
  assert.deepEqual(parsed.rows.map((row) => row.sourceSheet), ["可见一", "可见二"]);
});

test("未知接送类型作为行级错误返回", () => {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["临时交通安排"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "测试客人", 5, "13800000001", "未知地点", new Date("2026-07-17T06:00:00.000Z"), "赛那", 0, ""]
  ]);
  utils.book_append_sheet(workbook, sheet, "report");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "unknown.xlsx");
  assert.equal(parsed.rows[0].transportDirection, null);
  assert.match(parsed.rows[0].errors.join("；"), /无法从表格标题识别/);
  assert.equal(parsed.rows[0].requestedVehicleType, "business");
  assert.equal(parsed.rows[0].settlementAmount, "0.00");
});

test("收费超过两位小数时阻止导入而不静默舍入", () => {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["接机"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "测试客人", 2, "13800000001", "机场", new Date("2026-07-17T06:00:00.000Z"), "轿车", "12.345", ""]
  ]);
  utils.book_append_sheet(workbook, sheet, "report");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "money.xlsx");
  assert.equal(parsed.rows[0].settlementAmount, null);
  assert.match(parsed.rows[0].errors.join("；"), /收费金额/);
});

test("按中国语境将 XX站 识别为火车站，并排除汽车客运站等场所", () => {
  assert.equal(detectPickupTypeFromLocation("大理站"), "train");
  assert.equal(detectPickupTypeFromLocation("昆明南站"), "train");
  assert.equal(detectPickupTypeFromLocation("丽江站（高铁）"), "train");
  assert.equal(detectPickupTypeFromLocation("大理火车站"), "train");
  assert.equal(detectPickupTypeFromLocation("大理凤仪机场"), "airport");
  assert.equal(detectPickupTypeFromLocation("大理汽车客运站"), null);
  assert.equal(detectPickupTypeFromLocation("下关公交站"), null);
  assert.equal(detectPickupTypeFromLocation("人民路地铁站"), null);
});

test("标题只有离开方向时，可根据大理站补足为送站订单", () => {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["接送类型：离开"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "测试客人", 2, "13800000001", "大理站", new Date("2026-07-17T06:00:00.000Z"), "轿车", 0, ""]
  ]);
  utils.book_append_sheet(workbook, sheet, "report");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "dali-station.xlsx");

  assert.equal(parsed.rows[0].pickupType, "train");
  assert.equal(parsed.rows[0].transportDirection, "dropoff");
  assert.equal(parsed.rows[0].errors.length, 0);
  assert.match(parsed.rows[0].warnings.join("；"), /识别为火车站/);
});

test("标题与目的地类型冲突时保留明确标题并给出核对警告", () => {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["送机"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "测试客人", 2, "13800000001", "大理站", new Date("2026-07-17T06:00:00.000Z"), "轿车", 0, ""]
  ]);
  utils.book_append_sheet(workbook, sheet, "report");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "conflict.xlsx");

  assert.equal(parsed.rows[0].pickupType, "airport");
  assert.equal(parsed.rows[0].transportDirection, "dropoff");
  assert.match(parsed.rows[0].warnings.join("；"), /请核对/);
});

test("通用接送机标题不会把抵达接机误判为送机", () => {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    ["测试酒店"],
    ["交通服务查询表-接送机"],
    ["接送类型：抵达接机"],
    ["房号", "房类", "姓名", "接送人数", "预订人手机", "目的地", "接送时间", "车型", "收费", "备注"],
    ["A1", "S", "测试客人", 2, "13800000001", "大理凤仪机场", new Date("2026-07-17T06:00:00.000Z"), "轿车", 0, ""]
  ]);
  utils.book_append_sheet(workbook, sheet, "report");
  const data = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const parsed = parseOrderImportWorkbook(data, "airport-pickup.xlsx");

  assert.equal(parsed.rows[0].pickupType, "airport");
  assert.equal(parsed.rows[0].transportDirection, "pickup");
});
