import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { generateHotelCode } from "@/lib/code-generator";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelPublicSelect } from "@/lib/selects";
import { hotelCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "hotels", "view")) {
    return errorResponse("FORBIDDEN", "没有权限访问酒店数据", 403);
  }

  try {
    const where =
      user.roleCode === "hotel_frontdesk"
        ? { id: user.hotelId ?? "__none__" }
        : undefined;

    const hotels = await prisma.hotel.findMany({
      where,
      select: hotelPublicSelect,
      orderBy: { createdAt: "desc" }
    });

    return successResponse({ items: hotels });
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
    const parsed = hotelCreateSchema.parse(await request.json());
    const code = await generateHotelCode();
    const created = await prisma.hotel.create({
      data: {
        name: parsed.name,
        address: parsed.address,
        contactName: parsed.contactName,
        contactPhone: parsed.contactPhone,
        phone: parsed.phone,
        status: parsed.status,
        code
      },
      select: hotelPublicSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_HOTEL",
      targetType: "Hotel",
      targetId: created.id,
      afterData: created,
      remark: "创建酒店",
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
