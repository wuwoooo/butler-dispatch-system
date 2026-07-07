import { NextRequest } from "next/server";
import { findButlerAccountDetail, toButlerAccountPublic } from "@/lib/butler-accounts";
import { refreshButlerStatus } from "@/lib/order-status";
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
    const accountId = before.user.id;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: accountId }, data: { status: "active" } });
      await tx.butler.update({
        where: { id },
        data: { status: before.status === "disabled" ? "available" : undefined, dispatchEnabled: true }
      });
      await refreshButlerStatus(id, tx);
    });
    const updated = await findButlerAccountDetail(id);
    if (!updated) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    const result = toButlerAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "ENABLE_BUTLER_ACCOUNT",
      targetType: "User",
      targetId: before.user.id,
      beforeData: toButlerAccountPublic(before),
      afterData: result,
      remark: "启用管家账号",
      ...getRequestMeta(request)
    });
    return successResponse(result, "管家账号已启用");
  } catch (error) {
    return handleApiError(error);
  }
}
