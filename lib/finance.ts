import { Prisma, PrismaClient, SettlementStatus } from "@prisma/client";
import { buildOrderScopeWhere } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  ButlerServiceRecord,
  FinanceOrderRecord,
  HotelStatisticRecord
} from "@/types/domain";

type DbClient = Prisma.TransactionClient | PrismaClient;

type FinanceOrdersQuery = {
  page?: number;
  pageSize?: number;
  butlerId?: string;
  hotelId?: string;
  orderStatus?: string;
  pickupType?: string;
  startDate?: string;
  endDate?: string;
  arrivalStartTime?: string;
  arrivalEndTime?: string;
  settlementStatus?: SettlementStatus;
  keyword?: string;
};

type FinanceButlerServicesQuery = {
  page?: number;
  pageSize?: number;
  butlerId?: string;
  hotelId?: string;
  assignmentStatus?: string;
  startDate?: string;
  endDate?: string;
  pickupType?: string;
};

type FinanceHotelStatisticsQuery = {
  page?: number;
  pageSize?: number;
  hotelId?: string;
  startDate?: string;
  endDate?: string;
  pickupType?: string;
};

function buildCheckInRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    gte: startDate ? new Date(startDate) : undefined,
    lte: endDate ? new Date(endDate) : undefined
  };
}

function buildArrivalRange(arrivalStartTime?: string, arrivalEndTime?: string) {
  if (!arrivalStartTime && !arrivalEndTime) {
    return undefined;
  }

  return {
    gte: arrivalStartTime ? new Date(arrivalStartTime) : undefined,
    lte: arrivalEndTime ? new Date(arrivalEndTime) : undefined
  };
}

function buildOrderKeywordWhere(keyword?: string): Prisma.ServiceOrderWhereInput[] | undefined {
  if (!keyword) {
    return undefined;
  }

  return [
    { orderNo: { contains: keyword } },
    { guestName: { contains: keyword } },
    { guestPhone: { contains: keyword } },
    { flightTrainNo: { contains: keyword } }
  ];
}

function calcRoleAverage(reviews: Array<{ reviewerRole: string; overallScore: number }>, role: string) {
  const scoped = reviews.filter((review) => review.reviewerRole === role);

  if (scoped.length === 0) {
    return 0;
  }

  return round2(
    scoped.reduce((sum, review) => sum + review.overallScore, 0) / scoped.length
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function toFinanceOrderRecord(order: Awaited<ReturnType<typeof getFinanceOrdersRaw>>[number]): FinanceOrderRecord {
  const startedAtList = order.assignments
    .map((assignment) => assignment.serviceStartedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
  const serviceStartedAt = startedAtList.at(0) ?? null;

  const completedAtList = order.assignments
    .map((assignment) => assignment.completedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
  const completedAt = completedAtList.at(-1) ?? null;

  let serviceDuration = "";
  if (serviceStartedAt && completedAt) {
    const diffMs = completedAt.getTime() - serviceStartedAt.getTime();
    if (diffMs > 0) {
      const diffHours = diffMs / 1000 / 60 / 60;
      const days = Math.floor(diffHours / 24);
      const hours = Math.round(diffHours % 24);
      const parts: string[] = [];
      if (days > 0) {
        parts.push(`${days}天`);
      }
      if (hours > 0 || parts.length === 0) {
        parts.push(`${hours}小时`);
      }
      serviceDuration = parts.join("");
    } else {
      serviceDuration = "0小时";
    }
  }

  return {
    id: order.id,
    orderNo: order.orderNo,
    hotelName: order.hotel.name,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    guestCount: order.guestCount,
    serviceMode: order.serviceMode,
    transportDirection: order.transportDirection,
    serviceStartAt: order.serviceStartAt.toISOString(),
    serviceEndAt: order.serviceEndAt.toISOString(),
    checkInDate: order.checkInDate.toISOString(),
    checkOutDate: order.checkOutDate?.toISOString() ?? null,
    pickupType: order.pickupType,
    arrivalStation: order.arrivalStation,
    arrivalTime: order.arrivalTime.toISOString(),
    flightTrainNo: order.flightTrainNo,
    status: order.status,
    butlerNames: order.assignments.map((assignment) => assignment.butler.name),
    serviceStartedAt: serviceStartedAt?.toISOString() ?? null,
    serviceCompletedAt: completedAt?.toISOString() ?? null,
    serviceDuration,
    frontdeskAverageScore: calcRoleAverage(order.reviews, "hotel_frontdesk"),
    dispatcherAverageScore: calcRoleAverage(order.reviews, "dispatcher"),
    settlementAmount: order.settlementAmount?.toString() ?? null,
    settlementStatus: order.settlementStatus,
    settlementRemark: order.settlementRemark,
    createdAt: order.createdAt.toISOString()
  };
}

async function getFinanceOrdersRaw(
  user: AuthenticatedUser,
  query: FinanceOrdersQuery & { skip?: number; take?: number },
  client: DbClient = prisma
) {
  const scope = buildOrderScopeWhere(user);
  const finishedStatuses = ["pending_review", "reviewed", "completed"] as const;
  const statusFilter = query.orderStatus
    ? (finishedStatuses.includes(query.orderStatus as never) ? (query.orderStatus as never) : { in: [] as never })
    : { in: finishedStatuses as never };

  const where: Prisma.ServiceOrderWhereInput = {
    ...scope,
    hotelId:
      user.roleCode === "hotel_frontdesk"
        ? user.hotelId ?? "__none__"
        : query.hotelId || undefined,
    status: statusFilter,
    pickupType: query.pickupType as never,
    settlementStatus: query.settlementStatus,
    checkInDate: buildCheckInRange(query.startDate, query.endDate),
    arrivalTime: buildArrivalRange(query.arrivalStartTime, query.arrivalEndTime),
    assignments: query.butlerId ? {
      some: {
        butlerId: query.butlerId
      }
    } : undefined,
    OR: buildOrderKeywordWhere(query.keyword)
  };

  return client.serviceOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: query.skip,
    take: query.take,
    include: {
      hotel: {
        select: {
          id: true,
          name: true
        }
      },
      assignments: {
        orderBy: { assignedAt: "asc" },
        select: {
          id: true,
          status: true,
          serviceStartedAt: true,
          completedAt: true,
          butler: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      },
      reviews: {
        select: {
          reviewerRole: true,
          overallScore: true
        }
      }
    }
  });
}

export async function getFinanceOrders(
  user: AuthenticatedUser,
  query: FinanceOrdersQuery,
  client: DbClient = prisma
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const scope = buildOrderScopeWhere(user);
  const finishedStatuses = ["pending_review", "reviewed", "completed"] as const;
  const statusFilter = query.orderStatus
    ? (finishedStatuses.includes(query.orderStatus as never) ? (query.orderStatus as never) : { in: [] as never })
    : { in: finishedStatuses as never };

  const where: Prisma.ServiceOrderWhereInput = {
    ...scope,
    hotelId:
      user.roleCode === "hotel_frontdesk"
        ? user.hotelId ?? "__none__"
        : query.hotelId || undefined,
    status: statusFilter,
    pickupType: query.pickupType as never,
    settlementStatus: query.settlementStatus,
    checkInDate: buildCheckInRange(query.startDate, query.endDate),
    arrivalTime: buildArrivalRange(query.arrivalStartTime, query.arrivalEndTime),
    assignments: query.butlerId ? {
      some: {
        butlerId: query.butlerId
      }
    } : undefined,
    OR: buildOrderKeywordWhere(query.keyword)
  };

  const [rawRows, total] = await Promise.all([
    getFinanceOrdersRaw(user, { ...query, skip, take }, client),
    client.serviceOrder.count({ where })
  ]);

  const items = rawRows.map(toFinanceOrderRecord);

  return {
    items,
    total
  };
}

export async function getFinanceOrdersForExport(
  user: AuthenticatedUser,
  query: FinanceOrdersQuery,
  client: DbClient = prisma
) {
  const rows = await getFinanceOrdersRaw(user, query, client);
  return rows.map(toFinanceOrderRecord);
}

export async function getFinanceButlerServices(
  user: AuthenticatedUser,
  query: FinanceButlerServicesQuery,
  client: DbClient = prisma
) {
  const where: Prisma.OrderButlerAssignmentWhereInput = {
    butlerId: query.butlerId || undefined,
    status: query.assignmentStatus as never,
    order: {
      ...buildOrderScopeWhere(user),
      hotelId:
        user.roleCode === "hotel_frontdesk"
          ? user.hotelId ?? "__none__"
          : query.hotelId || undefined,
      pickupType: query.pickupType as never,
      checkInDate: buildCheckInRange(query.startDate, query.endDate)
    }
  };

  const skip = query.page && query.pageSize ? (query.page - 1) * query.pageSize : undefined;
  const take = query.pageSize || undefined;

  const [rows, total] = await Promise.all([
    client.orderButlerAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      skip,
      take,
      include: {
        butler: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
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
    client.orderButlerAssignment.count({ where })
  ]);

  const items: ButlerServiceRecord[] = rows.map((assignment) => {
    let serviceDuration = "";
    if (assignment.serviceStartedAt && assignment.completedAt) {
      const diffMs = assignment.completedAt.getTime() - assignment.serviceStartedAt.getTime();
      const diffMins = Math.round(diffMs / 1000 / 60);
      if (diffMins >= 60) {
        const hours = (diffMins / 60).toFixed(1);
        serviceDuration = `${hours} 小时`;
      } else {
        serviceDuration = `${diffMins} 分钟`;
      }
    }

    return {
      id: assignment.id,
      butlerName: assignment.butler.name,
      butlerPhone: assignment.butler.phone,
      orderNo: assignment.order.orderNo,
      hotelName: assignment.order.hotel.name,
      guestName: assignment.order.guestName,
      guestPhone: assignment.order.guestPhone,
      guestCount: assignment.order.guestCount,
      checkInDate: assignment.order.checkInDate.toISOString(),
      checkOutDate: assignment.order.checkOutDate.toISOString(),
      pickupType: assignment.order.pickupType,
      arrivalTime: assignment.order.arrivalTime.toISOString(),
      assignmentStatus: assignment.status,
      isRejected: assignment.status === "rejected",
      isCompleted: assignment.status === "completed",
      overallScore: average(assignment.reviews.map((review) => review.overallScore)),
      confirmedAt: assignment.confirmedAt?.toISOString() ?? null,
      pickedGuestAt: assignment.pickedGuestAt?.toISOString() ?? null,
      serviceStartedAt: assignment.serviceStartedAt?.toISOString() ?? null,
      completedAt: assignment.completedAt?.toISOString() ?? null,
      serviceDuration
    };
  });

  return {
    items,
    total
  };
}

export async function getFinanceButlerServicesForExport(
  user: AuthenticatedUser,
  query: FinanceButlerServicesQuery,
  client: DbClient = prisma
) {
  const cleanQuery = { ...query, page: undefined, pageSize: undefined };
  const result = await getFinanceButlerServices(user, cleanQuery, client);
  return result.items;
}

export async function getFinanceHotelStatistics(
  user: AuthenticatedUser,
  query: FinanceHotelStatisticsQuery,
  client: DbClient = prisma
) {
  const orders = await client.serviceOrder.findMany({
    where: {
      ...buildOrderScopeWhere(user),
      hotelId:
        user.roleCode === "hotel_frontdesk"
          ? user.hotelId ?? "__none__"
          : query.hotelId || undefined,
      pickupType: query.pickupType as never,
      checkInDate: buildCheckInRange(query.startDate, query.endDate)
    },
    include: {
      hotel: {
        select: {
          id: true,
          name: true
        }
      },
      reviews: {
        select: {
          overallScore: true
        }
      }
    }
  });

  const statsMap = new Map<string, HotelStatisticRecord>();

  for (const order of orders) {
    const current =
      statsMap.get(order.hotelId) ??
      {
        hotelId: order.hotelId,
        hotelName: order.hotel.name,
        orderCount: 0,
        completedOrderCount: 0,
        inServiceOrderCount: 0,
        pendingDispatchOrderCount: 0,
        pendingReviewOrderCount: 0,
        cancelledOrderCount: 0,
        guestCount: 0,
        airportOrderCount: 0,
        trainOrderCount: 0,
        averageScore: 0
      };

    current.orderCount += 1;
    current.guestCount += order.guestCount;
    current.completedOrderCount += Number(order.status === "completed" || order.status === "reviewed");
    current.inServiceOrderCount += Number(order.status === "in_service");
    current.pendingDispatchOrderCount += Number(order.status === "pending_dispatch");
    current.pendingReviewOrderCount += Number(order.status === "pending_review");
    current.cancelledOrderCount += Number(order.status === "cancelled");
    current.airportOrderCount += Number(order.pickupType === "airport");
    current.trainOrderCount += Number(order.pickupType === "train");

    statsMap.set(order.hotelId, current);
  }

  const reviewMap = new Map<string, number[]>();

  for (const order of orders) {
    const scores = reviewMap.get(order.hotelId) ?? [];
    scores.push(...order.reviews.map((review) => review.overallScore));
    reviewMap.set(order.hotelId, scores);
  }

  const items = Array.from(statsMap.values()).map((item) => ({
    ...item,
    averageScore: average(reviewMap.get(item.hotelId) ?? [])
  }));

  const skip = query.page && query.pageSize ? (query.page - 1) * query.pageSize : undefined;
  const take = query.pageSize || undefined;

  return {
    items: skip !== undefined && take !== undefined ? items.slice(skip, skip + take) : items,
    total: items.length
  };
}

export async function getFinanceHotelStatisticsForExport(
  user: AuthenticatedUser,
  query: FinanceHotelStatisticsQuery,
  client: DbClient = prisma
) {
  const cleanQuery = { ...query, page: undefined, pageSize: undefined };
  const result = await getFinanceHotelStatistics(user, cleanQuery, client);
  return result.items;
}
