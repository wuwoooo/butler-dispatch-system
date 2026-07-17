import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { notifyRoleUsers, notifyUsers } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { stayExtensionRequestSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["butler"]);
  if (!user) return response;
  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const body = stayExtensionRequestSchema.parse(await request.json());
    const { assignmentId } = await context.params;
    const meta = getRequestMeta(request);
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.orderButlerAssignment.findUnique({
        where: { id: assignmentId },
        include: { order: true, butler: true }
      });

      if (!assignment) throw new ApiError("ASSIGNMENT_NOT_FOUND", "分配记录不存在", 404);
      if (assignment.butlerId !== user.butlerId) {
        throw new ApiError("FORBIDDEN", "只能为自己的接待任务申请续住", 403);
      }
      if (!["picked_guest", "in_service"].includes(assignment.status)) {
        throw new ApiError("ASSIGNMENT_STATUS_NOT_ALLOWED", "只有正在接待的任务可以申请续住", 422);
      }
      if (!["in_service", "partial_completed"].includes(assignment.order.status)) {
        throw new ApiError("ORDER_STATUS_NOT_ALLOWED", "当前订单不能申请续住", 422);
      }
      if (assignment.order.serviceMode !== "stay") {
        throw new ApiError("ORDER_SERVICE_MODE_NOT_ALLOWED", "交通接送订单不支持申请续住", 422);
      }

      const requestedCheckOutAt = new Date(body.requestedCheckOutAt);
      if (requestedCheckOutAt <= assignment.order.checkOutDate) {
        throw new ApiError("STAY_EXTENSION_TIME_INVALID", "新的预计离店时间必须晚于当前预计离店时间", 422);
      }

      const pending = await tx.orderStayExtension.findFirst({
        where: { assignmentId, status: "pending" },
        select: { id: true }
      });
      if (pending) {
        throw new ApiError("STAY_EXTENSION_PENDING", "已有续住申请等待审核，请勿重复提交", 422);
      }

      const created = await tx.orderStayExtension.create({
        data: {
          orderId: assignment.orderId,
          assignmentId,
          originalCheckOutAt: assignment.order.checkOutDate,
          requestedCheckOutAt,
          reason: body.reason || null,
          requestedById: user.id
        },
        include: { requestedBy: { select: { id: true, name: true } } }
      });

      await Promise.all([
        notifyUsers(
          [assignment.order.createdById],
          {
            title: "客人续住待确认",
            content: `${assignment.butler.name} 上报订单 ${assignment.order.orderNo} 的客人续住至 ${formatDateTime(requestedCheckOutAt)}。`,
            type: "stay_extension_requested",
            targetType: "ServiceOrder",
            targetId: assignment.orderId,
            payload: { orderId: assignment.orderId, assignmentId, stayExtensionId: created.id }
          },
          tx
        ),
        notifyRoleUsers(
          ["dispatcher"],
          {
            title: "客人续住待确认",
            content: `${assignment.butler.name} 上报订单 ${assignment.order.orderNo} 的客人续住至 ${formatDateTime(requestedCheckOutAt)}。`,
            type: "stay_extension_requested",
            targetType: "ServiceOrder",
            targetId: assignment.orderId,
            payload: { orderId: assignment.orderId, assignmentId, stayExtensionId: created.id }
          },
          tx
        )
      ]);

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "REQUEST_STAY_EXTENSION",
          targetType: "OrderStayExtension",
          targetId: created.id,
          beforeData: toJson({ checkOutDate: assignment.order.checkOutDate }),
          afterData: toJson(created),
          remark: `管家上报客人续住至 ${formatDateTime(requestedCheckOutAt)}`,
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return created;
    });

    return successResponse(result, "续住申请已提交，等待前台或调配员确认");
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error.code, error.message, error.status);
    return handleApiError(error);
  }
}

class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

function formatDateTime(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
