import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelRoomTypeUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = hotelRoomTypeUpdateSchema.parse(await request.json());
    const before = await prisma.hotelRoomType.findUnique({
      where: { id }
    });

    if (!before) {
      return errorResponse("HOTEL_ROOM_TYPE_NOT_FOUND", "房型不存在", 404);
    }

    if (body.code) {
      const duplicated = await prisma.hotelRoomType.findFirst({
        where: {
          hotelId: before.hotelId,
          code: body.code,
          id: { not: id }
        },
        select: { id: true }
      });

      if (duplicated) {
        return errorResponse("ROOM_TYPE_CODE_DUPLICATE", "该酒店下房型编码已存在", 409);
      }
    }

    const updated = await prisma.hotelRoomType.update({
      where: { id },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        sort: body.sort ?? undefined,
        enabled: body.enabled ?? undefined,
        remark: body.remark === undefined ? undefined : body.remark ?? null
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_HOTEL_ROOM_TYPE",
      targetType: "HotelRoomType",
      targetId: id,
      beforeData: before,
      afterData: updated,
      remark: "修改酒店房型",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const before = await prisma.hotelRoomType.findUnique({
      where: { id }
    });

    if (!before) {
      return errorResponse("HOTEL_ROOM_TYPE_NOT_FOUND", "房型不存在", 404);
    }

    const roomCount = await prisma.hotelRoom.count({
      where: { roomTypeId: id }
    });
    if (roomCount > 0) {
      return errorResponse(
        "ROOM_TYPE_IN_USE",
        `该房型关联了 ${roomCount} 个房号，请先调整房间或将房型停用`,
        409
      );
    }

    try {
      await prisma.hotelRoomType.delete({
        where: { id }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return errorResponse(
          "ROOM_TYPE_IN_USE",
          "该房型已被房号引用，请先调整房间或将房型停用",
          409
        );
      }
      throw error;
    }

    await writeOperationLog({
      operatorId: user.id,
      operationType: "DELETE_HOTEL_ROOM_TYPE",
      targetType: "HotelRoomType",
      targetId: id,
      beforeData: before,
      remark: "删除酒店房型",
      ...getRequestMeta(request)
    });

    return successResponse({ id }, "删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
