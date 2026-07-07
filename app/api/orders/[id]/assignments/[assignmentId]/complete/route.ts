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

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher",
    "hotel_frontdesk"
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

      if (
        user.roleCode === "hotel_frontdesk" &&
        before.order.hotelId !== (user.hotelId ?? "__none__")
      ) {
        throw new ApiError("FORBIDDEN", "只能处理所属酒店订单", 403);
      }

      if (!completableAssignmentStatuses.includes(before.status)) {
        throw new ApiError("ASSIGNMENT_STATUS_NOT_ALLOWED", "当前分配状态不能确认完成", 422);
      }

      const after = await tx.orderButlerAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "completed",
          completedAt: new Date(),
          remark: body.remark ?? before.remark
        },
        include: {
          butler: true,
          order: true
        }
      });

      await updateOrderStatusAfterComplete(id, tx, {
        operatorId: user.id,
        remark:
          body.remark ??
          "后台确认该管家负责的客人已离店，释放管家状态",
        ...meta
      });
      await refreshButlerStatus(before.butlerId, tx);

      await Promise.all([
        notifyUsers(
          [before.order.createdById],
          {
            title: "管家服务已确认完成",
            content: `${before.butler.name} 负责的订单 ${before.order.orderNo} 服务已确认完成。`,
            type: "service_completed",
            targetType: "ServiceOrder",
            targetId: id,
            payload: { orderId: id, assignmentId }
          },
          tx
        ),
        notifyRoleUsers(
          ["dispatcher"],
          {
            title: "管家服务已确认完成",
            content: `${before.butler.name} 负责的订单 ${before.order.orderNo} 服务已确认完成。`,
            type: "service_completed",
            targetType: "ServiceOrder",
            targetId: id,
            payload: { orderId: id, assignmentId }
          },
          tx
        )
      ]);

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "COMPLETE_ASSIGNMENT_BY_BACKOFFICE",
          targetType: "OrderButlerAssignment",
          targetId: assignmentId,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark:
            body.remark ??
            "后台确认该管家负责的客人已离店，释放管家状态",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "已确认该管家服务完成");
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
