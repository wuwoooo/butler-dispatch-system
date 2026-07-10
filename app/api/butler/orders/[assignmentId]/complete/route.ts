import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { notifyRoleUsers, notifyUsers } from "@/lib/notification";
import {
  completableAssignmentStatuses,
  refreshButlerStatus,
  updateOrderStatusAfterComplete
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { butlerServiceActionSchema } from "@/lib/validators";

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
    const body = butlerServiceActionSchema.parse(await request.json().catch(() => ({})));
    const { assignmentId } = await context.params;
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

      if (!["in_service", "partial_completed"].includes(before.order.status)) {
        throw new ApiError("ORDER_STATUS_NOT_ALLOWED", "只有服务中订单可以完成服务", 422);
      }

      if (!completableAssignmentStatuses.includes(before.status)) {
        throw new ApiError("ASSIGNMENT_STATUS_NOT_ALLOWED", "当前分配状态不能完成服务", 422);
      }

      const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
      if (before.pickedGuestAt && occurredAt < before.pickedGuestAt) {
        throw new ApiError("COMPLETED_AT_BEFORE_PICKED_GUEST", "完成时间不能早于接到客人时间", 422);
      }

      await tx.orderButlerAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "completed",
          completedAt: occurredAt
        }
      });

      await updateOrderStatusAfterComplete(before.orderId, tx, {
        operatorId: user.id,
        remark: "管家确认自己负责的客人已离店，服务完成",
        ...meta
      });

      await refreshButlerStatus(before.butlerId, tx);

      const after = await tx.orderButlerAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          order: true,
          butler: true
        }
      });

      await Promise.all([
        notifyUsers(
          [before.order.createdById],
          {
            title: "服务已完成",
            content: `${before.butler.name} 已完成订单 ${before.order.orderNo} 中自己负责客人的服务。`,
            type: "service_completed",
            targetType: "ServiceOrder",
            targetId: before.orderId,
            payload: { orderId: before.orderId, assignmentId }
          },
          tx
        ),
        notifyRoleUsers(
          ["dispatcher"],
          {
            title: "服务已完成",
            content: `${before.butler.name} 已完成订单 ${before.order.orderNo} 中自己负责客人的服务。`,
            type: "service_completed",
            targetType: "ServiceOrder",
            targetId: before.orderId,
            payload: { orderId: before.orderId, assignmentId }
          },
          tx
        )
      ]);

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "BUTLER_COMPLETE_ORDER",
          targetType: "OrderButlerAssignment",
          targetId: assignmentId,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: "确认客人已离店并完成服务",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "服务已完成");
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
