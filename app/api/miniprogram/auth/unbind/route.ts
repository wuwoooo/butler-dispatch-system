import { NextRequest } from "next/server";
import { canUseMiniProgram } from "@/lib/accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser(request);
  if (!user) return response;
  if (!canUseMiniProgram(user.roleCode)) {
    return errorResponse("MINIPROGRAM_ROLE_NOT_ALLOWED", "当前角色暂不支持小程序端使用", 403);
  }
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { wechatOpenId: null, wechatUnionId: null, miniProgramBoundAt: null }
    });
    await writeOperationLog({
      operatorId: user.id,
      operationType: "MINIPROGRAM_UNBIND",
      targetType: "User",
      targetId: user.id,
      remark: "小程序账号自行解绑",
      ...getRequestMeta(request)
    });
    return successResponse({ id: user.id }, "小程序账号已解绑");
  } catch (error) {
    return handleApiError(error);
  }
}
