import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelPublicSelect, hotelRoomSelect } from "@/lib/selects";
import { hotelUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "hotels", "view")) {
    return errorResponse("FORBIDDEN", "没有权限访问酒店数据", 403);
  }

  try {
    const { id } = await context.params;

    if (user.roleCode === "hotel_frontdesk" && user.hotelId !== id) {
      return errorResponse("FORBIDDEN", "只能访问所属酒店", 403);
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      select: {
        ...hotelPublicSelect,
        rooms: {
          orderBy: { roomNo: "asc" },
          select: hotelRoomSelect
        },
        users: {
          where: {
            roleCode: "hotel_frontdesk"
          },
          select: {
            id: true,
            username: true,
            name: true,
            phone: true,
            status: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!hotel) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    return successResponse(hotel);
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
    const body = hotelUpdateSchema.parse(await request.json());
    const before = await prisma.hotel.findUnique({
      where: { id },
      select: hotelPublicSelect
    });

    if (!before) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    const updated = await prisma.hotel.update({
      where: { id },
      data: body,
      select: hotelPublicSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_HOTEL",
      targetType: "Hotel",
      targetId: updated.id,
      beforeData: before,
      afterData: updated,
      remark: "修改酒店",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}
