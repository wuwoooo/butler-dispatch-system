import { NextRequest } from "next/server";
import { generateHotelRoomTypeCode } from "@/lib/code-generator";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelRoomTypeCreateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;

    if (user.roleCode === "hotel_frontdesk" && user.hotelId !== id) {
      return errorResponse("FORBIDDEN", "只能查看所属酒店房型", 403);
    }

    const items = await prisma.hotelRoomType.findMany({
      where: {
        hotelId: id
      },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
    });

    return successResponse({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = hotelRoomTypeCreateSchema.parse(await request.json());

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      select: { id: true, name: true, code: true }
    });

    if (!hotel) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    const code = await generateHotelRoomTypeCode(id, hotel.code);

    if (code) {
      const duplicated = await prisma.hotelRoomType.findFirst({
        where: {
          hotelId: id,
          code
        },
        select: { id: true }
      });

      if (duplicated) {
        return errorResponse("ROOM_TYPE_CODE_DUPLICATE", "该酒店下房型编码已存在", 409);
      }
    }

    const created = await prisma.hotelRoomType.create({
      data: {
        hotelId: id,
        code,
        name: body.name,
        sort: body.sort,
        enabled: body.enabled,
        remark: body.remark ?? null
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_HOTEL_ROOM_TYPE",
      targetType: "HotelRoomType",
      targetId: created.id,
      afterData: created,
      remark: `为酒店 ${hotel.name} 新增房型`,
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
