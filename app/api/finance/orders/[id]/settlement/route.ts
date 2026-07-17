import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { settlementUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

import { ApiError } from "@/lib/api-error";

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

    const { before, updated } = await prisma.$transaction(async (tx) => {
      const before = await tx.serviceOrder.findUnique({
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
        throw new ApiError("ORDER_NOT_FOUND", "订单不存在", 404);
      }

      const updated = await tx.serviceOrder.update({
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

      return { before, updated };
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
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return handleApiError(error);
  }
}
