import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { findLeaveOrderConflicts, refreshLeaveStatuses } from "@/lib/leaves";
import { notifyUsers } from "@/lib/notification";
import { refreshButlerStatus } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

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
    await refreshLeaveStatuses();

    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.butlerLeave.findUnique({
        where: { id },
        include: {
          butler: {
            include: {
              user: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      });

      if (!before) {
        throw new ApiError("LEAVE_NOT_FOUND", "请假记录不存在", 404);
      }

      if (before.status !== "pending") {
        throw new ApiError("LEAVE_STATUS_NOT_ALLOWED", "只有待审核请假可以审核通过", 422);
      }

      const conflicts = await findLeaveOrderConflicts(
        before.butlerId,
        before.startAt,
        before.endAt,
        tx
      );

      if (conflicts.length > 0) {
        throw new ApiError(
          "LEAVE_ORDER_CONFLICT",
          "该时间段已有订单安排，暂不能审核通过。请先改派冲突订单。",
          409
        );
      }

      const after = await tx.butlerLeave.update({
        where: { id },
        data: {
          status: "approved",
          reviewerId: user.id,
          reviewedAt: new Date(),
          reviewRemark: null
        },
        include: {
          butler: {
            include: {
              user: {
                select: {
                  id: true
                }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              roleCode: true
            }
          }
        }
      });

      await refreshButlerStatus(after.butlerId, tx);
      await notifyUsers(
        [after.butler.user?.id],
        {
          title: "请假审核通过",
          content: "你的请假申请已通过。",
          type: "leave_approved",
          targetType: "ButlerLeave",
          targetId: after.id,
          payload: { leaveId: after.id }
        },
        tx
      );

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "APPROVE_LEAVE",
          targetType: "ButlerLeave",
          targetId: id,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: "调配员审核通过请假",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "请假审核已通过");
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }

    return handleApiError(error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
