import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { butlerOrderRecordsQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const query = butlerOrderRecordsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.OrderButlerAssignmentWhereInput = {
      butlerId: user.butlerId,
      status: query.status as Prisma.EnumAssignmentStatusFilter | undefined,
      order: {
        hotelId: query.hotelId || undefined,
        serviceStartAt:
          query.startTime || query.endTime
            ? {
                gte: query.startTime ? new Date(query.startTime) : undefined,
                lte: query.endTime ? new Date(query.endTime) : undefined
              }
            : undefined
      }
    };

    const [rows, total] = await Promise.all([
      prisma.orderButlerAssignment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              hotel: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          reviews: {
            select: {
              overallScore: true
            }
          }
        }
      }),
      prisma.orderButlerAssignment.count({ where })
    ]);

    const items = rows.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNo: item.order.orderNo,
      hotel: item.order.hotel,
      guestName: item.order.guestName,
      guestCount: item.order.guestCount,
      serviceMode: item.order.serviceMode,
      transportDirection: item.order.transportDirection,
      serviceStartAt: item.order.serviceStartAt,
      serviceEndAt: item.order.serviceEndAt,
      checkInDate: item.order.checkInDate,
      checkOutDate: item.order.checkOutDate,
      pickupType: item.order.pickupType,
      arrivalTime: item.order.arrivalTime,
      requestedVehicleInfo: item.order.requestedVehicleInfo,
      requestedVehicleType: item.order.requestedVehicleType,
      settlementAmount: item.order.settlementAmount,
      status: item.status,
      completed: item.status === "completed",
      score:
        item.reviews.length > 0
          ? Number(
              (
                item.reviews.reduce(
                  (sum, review) => sum + review.overallScore,
                  0
                ) / item.reviews.length
              ).toFixed(2)
            )
          : null,
      createdAt: item.createdAt
    }));

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
