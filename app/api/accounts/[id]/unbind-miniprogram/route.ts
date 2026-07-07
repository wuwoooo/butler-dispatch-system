import { NextRequest } from "next/server";
import { ensureBackendAccount } from "@/lib/account-actions";
import { accountPublicSelect, toAccountPublic } from "@/lib/accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const before = await ensureBackendAccount(id);
    if (!before) return errorResponse("ACCOUNT_NOT_FOUND", "后台账号不存在", 404);
    const updated = await prisma.user.update({
      where: { id },
      data: { wechatOpenId: null, wechatUnionId: null, miniProgramBoundAt: null },
      select: accountPublicSelect
    });
    const account = toAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "ADMIN_UNBIND_MINIPROGRAM",
      targetType: "User",
      targetId: id,
      beforeData: { miniProgramBound: Boolean(before.wechatOpenId) },
      afterData: { miniProgramBound: false },
      remark: "后台解绑小程序账号",
      ...getRequestMeta(request)
    });
    return successResponse(account, "小程序账号已解绑");
  } catch (error) {
    return handleApiError(error);
  }
}
