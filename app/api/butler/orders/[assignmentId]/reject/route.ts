import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { notifyRoleUsers } from "@/lib/notification";
import { refreshButlerStatus, updateOrderStatusAfterReject } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { rejectAssignmentSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ assignmentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  const meta = getRequestMeta(request);

  try {
    const { assignmentId } = await context.params;
    const body = rejectAssignmentSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.orderButlerAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          order: true,
          butler: true
        }
      });

      if (!before) {
        throw new ApiError("ASSIGNMENT_NOT_FOUND", "分配记录不存在", 404);
      }

      if (before.butlerId !== user.butlerId) {
        throw new ApiError("FORBIDDEN", "只能操作自己的订单", 403);
      }

      if (before.status !== "pending_confirm") {
        throw new ApiError("ASSIGNMENT_STATUS_NOT_ALLOWED", "只有待确认状态可以拒单", 422);
      }

      await tx.orderButlerAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectReason: body.rejectReason
        }
      });

      await tx.rejectRecord.create({
        data: {
          assignmentId,
          orderId: before.orderId,
          butlerId: before.butlerId,
          reason: body.rejectReason,
          createdById: user.id
        }
      });

      await tx.abnormalRecord.create({
        data: {
          orderId: before.orderId,
          butlerId: before.butlerId,
          abnormalType: "butler_reject",
          description: `管家拒单，原因：${body.rejectReason}`,
          status: "pending",
          createdById: user.id
        }
      });

      await tx.butler.update({
        where: { id: before.butlerId },
        data: {
          rejectCount: {
            increment: 1
          }
        }
      });

      await refreshButlerStatus(before.butlerId, tx);
      await updateOrderStatusAfterReject(before.orderId, tx, {
        operatorId: user.id,
        remark: "管家拒单",
        ...meta
      });

      await notifyRoleUsers(
        ["dispatcher"],
        {
          title: "管家拒单",
          content: `${before.butler.name} 拒绝订单 ${before.order.orderNo}，原因：${body.rejectReason}`,
          type: "butler_rejected",
          targetType: "ServiceOrder",
          targetId: before.orderId,
          payload: { orderId: before.orderId, assignmentId, rejectReason: body.rejectReason }
        },
        tx
      );

      const after = await tx.orderButlerAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          order: true,
          butler: true
        }
      });

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "BUTLER_REJECT_ORDER",
          targetType: "OrderButlerAssignment",
          targetId: assignmentId,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: body.rejectReason,
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "拒单成功");
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
