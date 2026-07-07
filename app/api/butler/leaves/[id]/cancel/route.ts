import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ id: string }>;
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
    const { id } = await context.params;
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.butlerLeave.findUnique({
        where: { id },
        include: {
          butler: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!before) {
        throw new ApiError("LEAVE_NOT_FOUND", "请假记录不存在", 404);
      }

      if (before.butlerId !== user.butlerId) {
        throw new ApiError("FORBIDDEN", "只能撤销自己的请假申请", 403);
      }

      if (before.status !== "pending") {
        throw new ApiError("LEAVE_STATUS_NOT_ALLOWED", "只有待审核请假可以撤销", 422);
      }

      const after = await tx.butlerLeave.update({
        where: { id },
        data: { status: "cancelled" },
        include: {
          butler: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "BUTLER_CANCEL_LEAVE",
          targetType: "ButlerLeave",
          targetId: id,
          beforeData: toJson(before),
          afterData: toJson(after),
          remark: "管家撤销请假",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return after;
    });

    return successResponse(result, "请假申请已撤销");
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
