import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { notifyUsers } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { leaveRejectSchema } from "@/lib/validators";

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
    const body = leaveRejectSchema.parse(await request.json());
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
        throw new ApiError("LEAVE_STATUS_NOT_ALLOWED", "只有待审核请假可以驳回", 422);
      }

      const after = await tx.butlerLeave.update({
        where: { id },
        data: {
          status: "rejected",
          reviewerId: user.id,
          reviewedAt: new Date(),
          reviewRemark: body.rejectReason
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

      await notifyUsers(
        [after.butler.user?.id],
        {
          title: "请假审核驳回",
          content: `你的请假申请已被驳回，驳回原因：${body.rejectReason}。`,
          type: "leave_rejected",
          targetType: "ButlerLeave",
          targetId: after.id,
          payload: { leaveId: after.id, rejectReason: body.rejectReason }
        },
        tx
      );

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "REJECT_LEAVE",
          targetType: "ButlerLeave",
          targetId: id,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: body.rejectReason,
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "请假审核已驳回");
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
