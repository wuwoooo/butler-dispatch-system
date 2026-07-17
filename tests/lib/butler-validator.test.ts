import assert from "node:assert/strict";
import test from "node:test";
import { butlerCreateSchema } from "@/lib/validators";

test("新增管家只校验档案字段，不要求登录账号或初始密码", () => {
  const result = butlerCreateSchema.safeParse({
    name: "测试管家",
    phone: "13800000000",
    vehicleType: "sedan",
    dispatchEnabled: true
  });

  assert.equal(result.success, true);
});
