import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import {
  findLeaveOrderConflicts,
  findOverlappingLeaves,
  refreshLeaveStatuses
} from "@/lib/leaves";
import { notifyRoleUsers } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { isEnabledBusinessDictValue } from "@/lib/system-dicts";
import { butlerLeaveQuerySchema, leaveCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    await refreshLeaveStatuses();
    const query = butlerLeaveQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.ButlerLeaveWhereInput = {
      butlerId: user.butlerId,
      status: query.status || undefined
    };

    if (query.startTime || query.endTime) {
      where.AND = [
        query.endTime
          ? {
              startAt: {
                lte: new Date(query.endTime)
              }
            }
          : {},
        query.startTime
          ? {
              endAt: {
                gte: new Date(query.startTime)
              }
            }
          : {}
      ];
    }

    const [items, total] = await Promise.all([
      prisma.butlerLeave.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              name: true,
              roleCode: true
            }
          }
        }
      }),
      prisma.butlerLeave.count({ where })
    ]);

    return successResponse({
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  const meta = getRequestMeta(request);

  try {
    const body = leaveCreateSchema.parse(await request.json());
    const isEnabledLeaveType = await isEnabledBusinessDictValue("leave_type", body.leaveType);
    if (!isEnabledLeaveType) {
      return errorResponse("LEAVE_TYPE_DISABLED", "请选择有效的请假类型", 422);
    }

    const startAt = new Date(body.leaveStartTime);
    const endAt = new Date(body.leaveEndTime);

    const created = await prisma.$transaction(async (tx) => {
      const [orderConflicts, leaveConflicts] = await Promise.all([
        findLeaveOrderConflicts(user.butlerId!, startAt, endAt, tx),
        findOverlappingLeaves(user.butlerId!, startAt, endAt, tx)
      ]);

      if (orderConflicts.length > 0) {
        throw new ApiError(
          "LEAVE_ORDER_CONFLICT",
          "该时间段已有订单安排，暂不能提交请假。请联系调配员改派相关订单后再提交。",
          409
        );
      }

      if (leaveConflicts.length > 0) {
        throw new ApiError(
          "LEAVE_TIME_OVERLAP",
          "该时间段与已有请假记录重叠，不能重复提交。",
          409
        );
      }

      const leave = await tx.butlerLeave.create({
        data: {
          butlerId: user.butlerId!,
          leaveType: body.leaveType,
          reason: body.reason,
          startAt,
          endAt,
          status: "pending"
        },
        include: {
          butler: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      });

      await notifyRoleUsers(
        ["dispatcher"],
        {
          title: "新的请假申请",
          content: `管家 ${leave.butler.name} 提交了请假申请，请及时审核。`,
          type: "leave_submitted",
          targetType: "ButlerLeave",
          targetId: leave.id,
          payload: { leaveId: leave.id, butlerId: user.butlerId }
        },
        tx
      );

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType: "BUTLER_SUBMIT_LEAVE",
          targetType: "ButlerLeave",
          targetId: leave.id,
          afterData: toJson(leave),
          remark: "管家提交请假",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return leave;
    });

    return successResponse(created, "请假申请已提交", { status: 201 });
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
