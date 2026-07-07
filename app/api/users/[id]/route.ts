import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { userPublicSelect } from "@/lib/selects";
import { userUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const found = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect
    });

    if (!found) {
      return errorResponse("USER_NOT_FOUND", "用户不存在", 404);
    }

    return successResponse(found);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = userUpdateSchema.parse(await request.json());
    const before = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect
    });

    if (!before) {
      return errorResponse("USER_NOT_FOUND", "用户不存在", 404);
    }

    const nextRoleCode = body.roleCode ?? before.roleCode;
    const nextHotelId =
      Object.prototype.hasOwnProperty.call(body, "hotelId")
        ? body.hotelId ?? null
        : before.hotelId;
    const nextButlerId =
      Object.prototype.hasOwnProperty.call(body, "butlerId")
        ? body.butlerId ?? null
        : before.butlerId;

    if (nextRoleCode === "hotel_frontdesk" && !nextHotelId) {
      return errorResponse("HOTEL_REQUIRED", "酒店前台账号必须绑定酒店", 422);
    }

    if (nextRoleCode === "butler" && !nextButlerId) {
      return errorResponse("BUTLER_REQUIRED", "管家账号必须绑定管家档案", 422);
    }

    const role = body.roleCode
      ? await prisma.role.findUnique({ where: { code: body.roleCode } })
      : null;

    if (body.roleCode && !role) {
      return errorResponse("ROLE_NOT_FOUND", "角色不存在，请先运行 seed", 422);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: body.username,
        passwordHash: body.password
          ? await hashPassword(body.password)
          : undefined,
        name: body.name,
        phone:
          Object.prototype.hasOwnProperty.call(body, "phone")
            ? body.phone ?? null
            : undefined,
        roleCode: body.roleCode,
        roleId: role?.id,
        status: body.status,
        hotelId:
          Object.prototype.hasOwnProperty.call(body, "hotelId")
            ? body.hotelId ?? null
            : undefined,
        butlerId:
          Object.prototype.hasOwnProperty.call(body, "butlerId")
            ? body.butlerId ?? null
            : undefined
      },
      select: userPublicSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_USER",
      targetType: "User",
      targetId: updated.id,
      beforeData: before,
      afterData: updated,
      remark: "修改用户",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}
