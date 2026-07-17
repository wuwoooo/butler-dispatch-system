import assert from "node:assert/strict";
import test from "node:test";
import {
  hotelCreateSchema,
  hotelRoomImportFileSchema,
  hotelUpdateSchema
} from "@/lib/validators";

test("新建酒店时将未填写的可选字段转换为 null", () => {
  const parsed = hotelCreateSchema.parse({
    name: " 测试酒店 ",
    address: "",
    contactName: "  ",
    contactPhone: "",
    phone: "",
    status: "active"
  });

  assert.deepEqual(parsed, {
    name: "测试酒店",
    address: null,
    contactName: null,
    contactPhone: null,
    phone: null,
    status: "active"
  });
});

test("编辑酒店时允许清空唯一电话字段", () => {
  assert.deepEqual(hotelUpdateSchema.parse({ phone: "" }), {
    phone: null
  });
});

test("酒店客房导入仅接受不超过 5 MB 的 Excel 文件元数据", () => {
  assert.equal(
    hotelRoomImportFileSchema.parse({ name: "rooms.xlsx", size: 1024 }).name,
    "rooms.xlsx"
  );
  assert.equal(
    hotelRoomImportFileSchema.safeParse({ name: "rooms.csv", size: 1024 }).success,
    false
  );
  assert.equal(
    hotelRoomImportFileSchema.safeParse({ name: "rooms.xls", size: 5 * 1024 * 1024 + 1 }).success,
    false
  );
});
