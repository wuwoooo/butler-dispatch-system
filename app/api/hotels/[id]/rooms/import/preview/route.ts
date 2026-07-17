import { NextRequest } from "next/server";
import { buildHotelRoomImportPlan, parseHotelRoomImportWorkbook } from "@/lib/hotel-room-import";
import { canImportHotelRooms } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelRoomImportFileSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) return response;
  if (!canImportHotelRooms(user)) {
    return errorResponse("FORBIDDEN", "没有权限批量导入酒店客房", 403);
  }

  try {
    const { id } = await context.params;
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!hotel) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return errorResponse("FILE_REQUIRED", "请选择导入文件", 422);
    }
    hotelRoomImportFileSchema.parse({ name: file.name, size: file.size });

    let parsed;
    try {
      parsed = parseHotelRoomImportWorkbook(await file.arrayBuffer(), file.name);
    } catch (error) {
      return errorResponse(
        "IMPORT_FILE_INVALID",
        error instanceof Error ? error.message : "文件无法解析，请确认为有效的房型表",
        422
      );
    }

    const [roomTypes, rooms] = await Promise.all([
      prisma.hotelRoomType.findMany({
        where: { hotelId: id },
        select: {
          id: true,
          code: true,
          name: true,
          sort: true,
          enabled: true,
          remark: true
        }
      }),
      prisma.hotelRoom.findMany({
        where: { hotelId: id },
        select: {
          id: true,
          roomNo: true,
          roomTypeId: true,
          enabled: true,
          remark: true
        }
      })
    ]);
    const plan = buildHotelRoomImportPlan(parsed, roomTypes, rooms);

    return successResponse({
      fileName: file.name,
      hotel,
      ...plan
    });
  } catch (error) {
    return handleApiError(error);
  }
}
