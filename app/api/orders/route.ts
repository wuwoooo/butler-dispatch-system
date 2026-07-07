import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildOrderScopeWhere, generateOrderNo } from "@/lib/orders";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { handleApiError, successResponse, errorResponse } from "@/lib/response";
import { orderListSelect } from "@/lib/selects";
import { orderCreateSchema, orderListQuerySchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "orders", "view")) {
    return errorResponse("FORBIDDEN", "没有权限查看订单", 403);
  }

  try {
    const query = orderListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.ServiceOrderWhereInput = {
      ...buildOrderScopeWhere(user),
      hotelId: query.hotelId || undefined,
      status: query.status || undefined,
      pickupType: query.pickupType || undefined,
      guestName: query.guestName
        ? { contains: query.guestName }
        : undefined,
      orderNo: query.orderNo ? { contains: query.orderNo } : undefined,
      checkInDate:
        query.checkInStart || query.checkInEnd
          ? {
              gte: query.checkInStart ? new Date(query.checkInStart) : undefined,
              lte: query.checkInEnd ? new Date(query.checkInEnd) : undefined
            }
          : undefined,
      arrivalTime:
        query.arrivalStart || query.arrivalEnd
          ? {
              gte: query.arrivalStart ? new Date(query.arrivalStart) : undefined,
              lte: query.arrivalEnd ? new Date(query.arrivalEnd) : undefined
            }
          : undefined
    };

    if (user.roleCode === "hotel_frontdesk") {
      where.hotelId = user.hotelId ?? "__none__";
    }

    const [items, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        select: orderListSelect,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" }
      }),
      prisma.serviceOrder.count({ where })
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
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "orders", "create")) {
    return errorResponse("FORBIDDEN", "没有权限创建订单", 403);
  }

  try {
    const body = orderCreateSchema.parse(await request.json());
    const hotelId =
      user.roleCode === "hotel_frontdesk" ? user.hotelId : body.hotelId;

    if (!hotelId) {
      return errorResponse("HOTEL_REQUIRED", "酒店前台账号必须绑定酒店", 422);
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true }
    });

    if (!hotel) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    const created = await prisma.serviceOrder.create({
      data: {
        orderNo: await generateOrderNo(),
        hotelId,
        createdById: user.id,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        guestCount: body.guestCount,
        checkInDate: new Date(body.checkInDate),
        checkOutDate: new Date(body.checkOutDate),
        roomType: body.roomType ?? null,
        roomNo: body.roomNo ?? null,
        pickupType: body.pickupType,
        arrivalStation: body.arrivalStation ?? "",
        arrivalTime: new Date(body.arrivalTime),
        flightTrainNo: body.flightTrainNo ?? null,
        destination: body.destination ?? null,
        specialNeeds: body.specialNeeds ?? null,
        remark: body.remark ?? null,
        status: "pending_dispatch"
      },
      select: orderListSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_ORDER",
      targetType: "ServiceOrder",
      targetId: created.id,
      afterData: created,
      remark: "创建订单",
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
