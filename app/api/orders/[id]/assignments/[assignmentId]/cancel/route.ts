import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  refreshButlerStatus,
  updateOrderStatusAfterCancelDispatch
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher"
  ]);

  if (!user) {
    return response;
  }

  const meta = getRequestMeta(request);

  try {
    const { id, assignmentId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      remark?: string;
    };
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.orderButlerAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          butler: true,
          order: true
        }
      });

      if (!before || before.orderId !== id) {
        throw new ApiError("ASSIGNMENT_NOT_FOUND", "分配记录不存在", 404);
      }

      if (before.status !== "pending_confirm") {
        throw new ApiError(
          "ASSIGNMENT_STATUS_NOT_ALLOWED",
          "只有待接单派单可以取消",
          422
        );
      }

      const after = await tx.orderButlerAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          remark: body.remark ?? before.remark
        },
        include: {
          butler: true,
          order: true
        }
      });

      await updateOrderStatusAfterCancelDispatch(id, tx, {
        operatorId: user.id,
        remark: body.remark ?? "调配员取消待接单派单",
        ...meta
      });
      await refreshButlerStatus(before.butlerId, tx);

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "CANCEL_DISPATCH_ASSIGNMENT",
          targetType: "OrderButlerAssignment",
          targetId: assignmentId,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: body.remark ?? "取消待接单派单",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "派单已取消");
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }

    return handleApiError(error);
  }
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
