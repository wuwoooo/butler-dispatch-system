import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { notifyRoleUsers, notifyUsers } from "@/lib/notification";
import {
  refreshButlerStatus,
  updateOrderStatusAfterPickedGuest
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

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

      if (before.status !== "confirmed") {
        throw new ApiError("ASSIGNMENT_STATUS_NOT_ALLOWED", "只有已确认状态可以点击已接到客人", 422);
      }

      const now = new Date();
      await tx.orderButlerAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "picked_guest",
          pickedGuestAt: now,
          serviceStartedAt: now
        }
      });

      await refreshButlerStatus(before.butlerId, tx);

      await updateOrderStatusAfterPickedGuest(before.orderId, tx, {
        operatorId: user.id,
        remark: "管家已接到自己负责的客人",
        ...meta
      });

      const orderUsers = [before.order.createdById];

      await Promise.all([
        notifyUsers(
          orderUsers,
          {
            title: "客人已接到",
            content: `${before.butler.name} 已接到订单 ${before.order.orderNo} 中自己负责的客人。`,
            type: "guest_picked",
            targetType: "ServiceOrder",
            targetId: before.orderId,
            payload: { orderId: before.orderId, assignmentId }
          },
          tx
        ),
        notifyRoleUsers(
          ["dispatcher"],
          {
            title: "客人已接到",
            content: `${before.butler.name} 已接到订单 ${before.order.orderNo} 中自己负责的客人。`,
            type: "guest_picked",
            targetType: "ServiceOrder",
            targetId: before.orderId,
            payload: { orderId: before.orderId, assignmentId }
          },
          tx
        )
      ]);

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
          operationType: "BUTLER_PICKED_GUEST",
          targetType: "OrderButlerAssignment",
          targetId: assignmentId,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: "已接到客人",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "已更新为接到客人");
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
