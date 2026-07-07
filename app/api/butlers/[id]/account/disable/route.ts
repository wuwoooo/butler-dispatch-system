import { NextRequest } from "next/server";
import { findButlerAccountDetail, toButlerAccountPublic } from "@/lib/butler-accounts";
import { findButlerActiveAssignments } from "@/lib/order-status";
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
    const activeAssignments = await findButlerActiveAssignments(id);
    if (activeAssignments.length > 0) {
      return errorResponse(
        "BUTLER_ACTIVE_ORDER_CONFLICT",
        `管家仍有活跃订单（${activeAssignments.map((item) => item.order.orderNo).join("、")}），请先完成或改派后再停用账号`,
        422
      );
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: before.user.id }, data: { status: "disabled" } }),
      prisma.butler.update({ where: { id }, data: { status: "disabled", dispatchEnabled: false } })
    ]);
    const updated = await findButlerAccountDetail(id);
    if (!updated) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    const result = toButlerAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "DISABLE_BUTLER_ACCOUNT",
      targetType: "User",
      targetId: before.user.id,
      beforeData: toButlerAccountPublic(before),
      afterData: result,
      remark: "停用管家账号，并同步停用管家接单状态",
      ...getRequestMeta(request)
    });
    return successResponse(result, "管家账号已停用");
  } catch (error) {
    return handleApiError(error);
  }
}
