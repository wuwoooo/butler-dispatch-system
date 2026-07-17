import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { generateButlerCode } from "@/lib/code-generator";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { butlerWithAccountSelect } from "@/lib/selects";
import { butlerCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "butlers", "view") && user.roleCode !== "butler") {
    return errorResponse("FORBIDDEN", "没有权限访问管家数据", 403);
  }

  try {
    const where =
      user.roleCode === "butler"
        ? { id: user.butlerId ?? "__none__" }
        : undefined;

    const butlers = await prisma.butler.findMany({
      where,
      select: butlerWithAccountSelect,
      orderBy: { createdAt: "desc" }
    });

    return successResponse({ items: butlers.map(toButlerPublic) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher"
  ]);

  if (!user) {
    return response;
  }

  try {
    const parsed = butlerCreateSchema.parse(await request.json());
    const code = await generateButlerCode();
    const created = await prisma.butler.create({
      data: {
        name: parsed.name,
        phone: parsed.phone,
        gender: parsed.gender,
        vehicleType: parsed.vehicleType,
        vehicleInfo: parsed.vehicleInfo,
        dispatchEnabled: parsed.dispatchEnabled,
        status: "available",
        remark: parsed.remark,
        code
      },
      select: butlerWithAccountSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_BUTLER",
      targetType: "Butler",
      targetId: created.id,
      afterData: toButlerPublic(created),
      remark: "创建管家档案",
      ...getRequestMeta(request)
    });

    return successResponse(toButlerPublic(created), "创建成功", { status: 201 });
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
