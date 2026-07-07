import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/logger";
import { findButlerActiveAssignments, refreshButlerStatus } from "@/lib/order-status";
import { getRequestMeta, requireApiRoles, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { butlerWithAccountSelect } from "@/lib/selects";
import { butlerUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "butlers", "view") && user.roleCode !== "butler") {
    return errorResponse("FORBIDDEN", "没有权限访问管家数据", 403);
  }

  try {
    const { id } = await context.params;

    if (user.roleCode === "butler" && user.butlerId !== id) {
      return errorResponse("FORBIDDEN", "只能访问自己的管家档案", 403);
    }

    const butler = await prisma.butler.findUnique({
      where: { id },
      select: butlerWithAccountSelect
    });

    if (!butler) {
      return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    }

    return successResponse(toButlerPublic(butler));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher"
  ]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const rawBody = await request.json() as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(rawBody, "status")) {
      const activeAssignments = await findButlerActiveAssignments(id);
      const orderNos = activeAssignments.map((item) => item.order.orderNo).join("、");
      return errorResponse(
        "BUTLER_STATUS_AUTO_MANAGED",
        orderNos
          ? `管家仍有活跃订单（${orderNos}），当前服务状态由订单自动计算，不能手动设为空闲。`
          : "当前服务状态由订单和请假自动计算，不能手动修改。",
        422
      );
    }
    const body = butlerUpdateSchema.parse(rawBody);
    const before = await prisma.butler.findUnique({
      where: { id },
      select: butlerWithAccountSelect
    });

    if (!before) {
      return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.butler.update({
        where: { id },
        data: body
      });
      // 当前服务状态由活跃订单和请假重新计算，编辑档案不能将服务中的管家伪装为空闲。
      await refreshButlerStatus(id, tx);
      return tx.butler.findUniqueOrThrow({
        where: { id },
        select: butlerWithAccountSelect
      });
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_BUTLER",
      targetType: "Butler",
      targetId: updated.id,
      beforeData: toButlerPublic(before),
      afterData: toButlerPublic(updated),
      remark: "修改管家档案或接单设置",
      ...getRequestMeta(request)
    });

    return successResponse(toButlerPublic(updated), "修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}

function toButlerPublic<T extends {
  user: { wechatOpenId: string | null } | null;
  assignments?: unknown;
}>(butler: T) {
  const { user, assignments, ...profile } = butler;
  const activeAssignments = Array.isArray(assignments) ? assignments : [];
  if (!user) return { ...profile, activeAssignments, user: null };
  const { wechatOpenId, ...safeUser } = user;
  return {
    ...profile,
    activeAssignments,
    user: { ...safeUser, miniProgramBound: Boolean(wechatOpenId) }
  };
}
