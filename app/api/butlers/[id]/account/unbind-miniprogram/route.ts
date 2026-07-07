import { NextRequest } from "next/server";
import { findButlerAccountDetail, toButlerAccountPublic } from "@/lib/butler-accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const before = await findButlerAccountDetail(id);
    if (!before) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    if (!before.user) return errorResponse("BUTLER_ACCOUNT_NOT_FOUND", "该管家尚未开通登录账号", 404);
    await prisma.user.update({
      where: { id: before.user.id },
      data: { wechatOpenId: null, wechatUnionId: null, miniProgramBoundAt: null }
    });
    const updated = await findButlerAccountDetail(id);
    if (!updated) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    const result = toButlerAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "ADMIN_UNBIND_MINIPROGRAM",
      targetType: "User",
      targetId: before.user.id,
      beforeData: { miniProgramBound: Boolean(before.user.wechatOpenId) },
      afterData: { miniProgramBound: false },
      remark: "后台解绑管家小程序账号",
      ...getRequestMeta(request)
    });
    return successResponse(result, "管家小程序账号已解绑");
  } catch (error) {
    return handleApiError(error);
  }
}
