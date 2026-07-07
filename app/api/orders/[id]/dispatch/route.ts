import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { createNotification } from "@/lib/notification";
import {
  dispatchableOrderStatuses,
  getButlerAvailabilityForOrder,
  getOrderDetail
} from "@/lib/orders";
import {
  refreshButlerStatus,
  updateOrderStatusAfterDispatch
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { dispatchAssignSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
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
    const { id } = await context.params;
    const body = dispatchAssignSchema.parse(await request.json());
    const selectedIds = Array.from(new Set(body.butlerIds));
    const result = await prisma.$transaction(async (tx) => {
      const before = await getOrderDetail(id, tx);

      if (!before) {
        throw new ApiError("ORDER_NOT_FOUND", "订单不存在", 404);
      }

      if (!dispatchableOrderStatuses.includes(before.status)) {
        throw new ApiError(
          "ORDER_STATUS_NOT_ALLOWED",
          "当前订单状态不允许派单",
          422
        );
      }

      const availability = await getButlerAvailabilityForOrder(id, tx);

      if (!availability) {
        throw new ApiError("ORDER_NOT_FOUND", "订单不存在", 404);
      }

      const existingAssignments = await tx.orderButlerAssignment.findMany({
        where: { orderId: id },
        select: {
          id: true,
          butlerId: true,
          status: true
        }
      });
      const existingByButlerId = new Map(
        existingAssignments.map((assignment) => [assignment.butlerId, assignment])
      );
      const createdAssignments: string[] = [];
      const unavailableMessages: string[] = [];

      for (const butlerId of selectedIds) {
        const existing = existingByButlerId.get(butlerId);

        if (existing && existing.status !== "cancelled") {
          unavailableMessages.push(`管家已存在分配历史，不能重复分配`);
          continue;
        }

        const item = availability.find((candidate) => candidate.id === butlerId);

        if (!item) {
          unavailableMessages.push("管家不存在");
        } else if (!item.available) {
          unavailableMessages.push(`${item.name}: ${item.unavailableReasons.join("、")}`);
        }
      }

      if (unavailableMessages.length > 0) {
        throw new ApiError(
          "BUTLER_UNAVAILABLE",
          Array.from(new Set(unavailableMessages)).join("；"),
          422
        );
      }

      for (const butlerId of selectedIds) {
        const existing = existingByButlerId.get(butlerId);

        if (existing?.status === "cancelled") {
          const reactivated = await tx.orderButlerAssignment.update({
            where: { id: existing.id },
            data: {
              status: "pending_confirm",
              assignedById: user.id,
              assignedAt: new Date(),
              confirmedAt: null,
              rejectedAt: null,
              pickedGuestAt: null,
              serviceStartedAt: null,
              completedAt: null,
              reassignedAt: null,
              cancelledAt: null,
              rejectReason: null,
              remark: body.remark ?? null
            },
            select: {
              id: true
            }
          });
          createdAssignments.push(reactivated.id);
        } else {
          const created = await tx.orderButlerAssignment.create({
            data: {
              orderId: id,
              butlerId,
              status: "pending_confirm",
              assignedById: user.id,
              remark: body.remark ?? null
            },
            select: {
              id: true
            }
          });
          createdAssignments.push(created.id);
        }
      }

      await updateOrderStatusAfterDispatch(id, tx, {
        operatorId: user.id,
        remark: "派单后订单进入待确认",
        ...meta
      });

      await Promise.all(selectedIds.map((butlerId) => refreshButlerStatus(butlerId, tx)));

      const assignedUsers = await tx.user.findMany({
        where: {
          butlerId: {
            in: selectedIds
          },
          status: "active"
        },
        select: {
          id: true,
          butlerId: true
        }
      });

      await Promise.all(
        assignedUsers.map((recipient) =>
          createNotification(
            {
              recipientId: recipient.id,
              title: "新的派单任务",
              content: `订单 ${before.orderNo} 已分配给你，请及时确认接单。`,
              type: "dispatch_assigned",
              targetType: "ServiceOrder",
              targetId: id,
              payload: {
                orderId: id,
                butlerId: recipient.butlerId
              }
            },
            tx
          )
        )
      );

      const after = await getOrderDetail(id, tx);

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "DISPATCH_ORDER",
          targetType: "ServiceOrder",
          targetId: id,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: `派单：新增或重新分配 ${createdAssignments.length} 个分配`,
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "派单成功");
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
