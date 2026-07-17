import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { findOrderAssignmentTimeConflictsAfterOrderChange, formatOrderWindow, getOrderServiceWindow } from "@/lib/order-conflicts";
import { canAccess } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { stayExtensionReviewSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string; extensionId: string }> };
const inactiveOrderStatuses = ["cancelled", "abnormal", "pending_review", "reviewed", "completed"];

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher", "hotel_frontdesk"]);
  if (!user) return response;
  if (!canAccess(user, "orders", "update")) return errorResponse("FORBIDDEN", "没有权限处理续住申请", 403);

  try {
    const body = stayExtensionReviewSchema.parse(await request.json());
    const { id, extensionId } = await context.params;
    const meta = getRequestMeta(request);
    const result = await prisma.$transaction(async (tx) => {
      const extension = await tx.orderStayExtension.findUnique({
        where: { id: extensionId },
        include: {
          requestedBy: { select: { id: true, name: true } },
          order: {
            include: {
              assignments: {
                where: { status: { in: ["pending_confirm", "confirmed", "picked_guest", "in_service"] } },
                include: { butler: { include: { user: { select: { id: true } } } } }
              }
            }
          }
        }
      });

      if (!extension || extension.orderId !== id) throw new ApiError("STAY_EXTENSION_NOT_FOUND", "续住申请不存在", 404);
      if (user.roleCode === "hotel_frontdesk" && extension.order.hotelId !== (user.hotelId ?? "__none__")) {
        throw new ApiError("FORBIDDEN", "只能处理所属酒店订单的续住申请", 403);
      }
      if (extension.status !== "pending") throw new ApiError("STAY_EXTENSION_ALREADY_REVIEWED", "该续住申请已处理", 422);
      if (inactiveOrderStatuses.includes(extension.order.status)) throw new ApiError("ORDER_STATUS_NOT_ALLOWED", "当前订单不能处理续住申请", 422);
      if (extension.order.serviceMode !== "stay") throw new ApiError("ORDER_SERVICE_MODE_NOT_ALLOWED", "交通接送订单不支持续住", 422);

      if (body.action === "approve") {
        if (extension.requestedCheckOutAt <= extension.order.checkOutDate) {
          throw new ApiError("STAY_EXTENSION_TIME_INVALID", "新的预计离店时间必须晚于当前预计离店时间", 422);
        }
        const targetWindow = getOrderServiceWindow({
          arrivalTime: extension.order.arrivalTime,
          checkInDate: extension.order.checkInDate,
          checkOutDate: extension.requestedCheckOutAt
        });
        const conflicts = await findOrderAssignmentTimeConflictsAfterOrderChange(id, targetWindow, tx);
        if (conflicts.length > 0) {
          const details = conflicts.slice(0, 5).map((item) => `${item.butlerName} 已有订单 ${item.orderNo}（${formatOrderWindow(item.window)}）`).join("；");
          throw new ApiError("ORDER_TIME_CONFLICT", `续住时间与已分配管家的其他订单冲突：${details}`, 422);
        }
        const butlerIds = extension.order.assignments.map((assignment) => assignment.butlerId);
        const leaveConflicts = await tx.butlerLeave.findMany({
          where: {
            butlerId: { in: butlerIds },
            status: { in: ["approved", "active"] },
            startAt: { lt: targetWindow.endAt },
            endAt: { gt: targetWindow.startAt }
          },
          include: { butler: { select: { name: true } } },
          orderBy: { startAt: "asc" }
        });
        if (leaveConflicts.length > 0) {
          const details = leaveConflicts
            .slice(0, 5)
            .map((leave) => `${leave.butler.name} 请假至 ${formatDateTime(leave.endAt)}`)
            .join("；");
          throw new ApiError("STAY_EXTENSION_LEAVE_CONFLICT", `续住时间与已分配管家请假冲突：${details}`, 422);
        }
      }

      const now = new Date();
      const reviewed = await tx.orderStayExtension.update({
        where: { id: extensionId },
        data: {
          status: body.action === "approve" ? "approved" : "rejected",
          reviewedById: user.id,
          reviewedAt: now,
          reviewRemark: body.reviewRemark || null
        }
      });

      const updatedOrder = body.action === "approve"
        ? await tx.serviceOrder.update({
            where: { id },
            data: {
              checkOutDate: extension.requestedCheckOutAt,
              serviceEndAt: (() => {
                const endAt = new Date(extension.requestedCheckOutAt);
                endAt.setHours(23, 59, 59, 999);
                return endAt;
              })()
            }
          })
        : extension.order;

      const butlerUserIds = extension.order.assignments.map((assignment) => assignment.butler.user?.id);
      await notifyUsers(
        [extension.requestedById, ...butlerUserIds],
        {
          title: body.action === "approve" ? "客人续住已确认" : "客人续住未通过",
          content: body.action === "approve"
            ? `订单 ${extension.order.orderNo} 已续住至 ${formatDateTime(extension.requestedCheckOutAt)}。`
            : `订单 ${extension.order.orderNo} 的续住申请未通过${body.reviewRemark ? `：${body.reviewRemark}` : ""}。`,
          type: body.action === "approve" ? "stay_extension_approved" : "stay_extension_rejected",
          targetType: "ServiceOrder",
          targetId: id,
          payload: { orderId: id, assignmentId: extension.assignmentId, stayExtensionId: extensionId }
        },
        tx
      );

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: body.action === "approve" ? "APPROVE_STAY_EXTENSION" : "REJECT_STAY_EXTENSION",
          targetType: "OrderStayExtension",
          targetId: extensionId,
          beforeData: toJson(extension),
          afterData: toJson({ extension: reviewed, order: updatedOrder }),
          remark: body.action === "approve" ? `确认客人续住至 ${formatDateTime(extension.requestedCheckOutAt)}` : "驳回客人续住申请",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return { extension: reviewed, order: updatedOrder };
    });

    return successResponse(result, body.action === "approve" ? "续住已确认" : "续住申请已驳回");
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
