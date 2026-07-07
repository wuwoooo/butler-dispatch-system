import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { settlementUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "finance"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = settlementUpdateSchema.parse(await request.json());
    const before = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNo: true,
        settlementStatus: true,
        settlementRemark: true,
        settledAt: true,
        settledById: true
      }
    });

    if (!before) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        settlementStatus: body.settlementStatus,
        settlementRemark: body.settlementRemark ?? null,
        settledAt: body.settlementStatus === "settled" ? new Date() : null,
        settledById: body.settlementStatus === "settled" ? user.id : null
      },
      select: {
        id: true,
        orderNo: true,
        settlementStatus: true,
        settlementRemark: true,
        settledAt: true,
        settledById: true
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_SETTLEMENT_STATUS",
      targetType: "ServiceOrder",
      targetId: id,
      beforeData: before,
      afterData: updated,
      remark: `修改结算状态为 ${body.settlementStatus}`,
      ...getRequestMeta(request)
    });

    return successResponse(updated, "结算状态已更新");
  } catch (error) {
    return handleApiError(error);
  }
}
