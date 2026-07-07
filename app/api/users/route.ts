import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { userPublicSelect } from "@/lib/selects";
import { userCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const users = await prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { createdAt: "desc" }
    });

    return successResponse({ items: users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const body = userCreateSchema.parse(await request.json());

    if (body.roleCode === "hotel_frontdesk" && !body.hotelId) {
      return errorResponse("HOTEL_REQUIRED", "酒店前台账号必须绑定酒店", 422);
    }

    if (body.roleCode === "butler" && !body.butlerId) {
      return errorResponse("BUTLER_REQUIRED", "管家账号必须绑定管家档案", 422);
    }

    const role = await prisma.role.findUnique({
      where: { code: body.roleCode }
    });

    if (!role) {
      return errorResponse("ROLE_NOT_FOUND", "角色不存在，请先运行 seed", 422);
    }

    const created = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        name: body.name,
        phone: body.phone ?? null,
        roleCode: body.roleCode,
        roleId: role.id,
        status: body.status,
        hotelId: body.hotelId ?? null,
        butlerId: body.butlerId ?? null
      },
      select: userPublicSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_USER",
      targetType: "User",
      targetId: created.id,
      afterData: created,
      remark: "创建用户",
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
