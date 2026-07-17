import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { getRequestMeta } from "@/lib/request";

const USER_AGENT_MAX_LENGTH = 255;

function createRequest(userAgent?: string) {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.1"
  });

  if (userAgent !== undefined) {
    headers.set("user-agent", userAgent);
  }

  return new NextRequest("https://example.test/api/demo", { headers });
}

test("请求元数据会截断超过操作日志字段上限的 User-Agent", () => {
  const userAgent = "x".repeat(321);
  const meta = getRequestMeta(createRequest(userAgent));

  assert.equal(meta.userAgent, userAgent.slice(0, USER_AGENT_MAX_LENGTH));
  assert.equal(meta.userAgent?.length, USER_AGENT_MAX_LENGTH);
  assert.equal(meta.ip, "203.0.113.10");
});

test("请求元数据保留不超过字段上限的 User-Agent", () => {
  const userAgent = "y".repeat(USER_AGENT_MAX_LENGTH);

  assert.equal(getRequestMeta(createRequest(userAgent)).userAgent, userAgent);
});

test("请求缺少 User-Agent 时返回 null", () => {
  assert.equal(getRequestMeta(createRequest()).userAgent, null);
});
