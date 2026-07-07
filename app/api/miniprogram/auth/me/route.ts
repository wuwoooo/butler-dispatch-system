import { NextRequest } from "next/server";
import { canUseMiniProgram } from "@/lib/accounts";
import { requireApiUser } from "@/lib/request";
import { errorResponse, successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);
  if (!user) return response;
  if (!canUseMiniProgram(user.roleCode)) {
    return errorResponse("MINIPROGRAM_ROLE_NOT_ALLOWED", "当前角色暂不支持小程序端使用", 403);
  }
  return successResponse({ user });
}
