import { Prisma, PrismaClient } from "@prisma/client";
import { buildOrderScopeWhere } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";

type DbClient = Prisma.TransactionClient | PrismaClient;

type DashboardQuery = {
  startDate?: string;
  endDate?: string;
  hotelId?: string;
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

function buildScopedHotelId(user: AuthenticatedUser, hotelId?: string) {
  if (user.roleCode === "hotel_frontdesk") {
    return user.hotelId ?? "__none__";
  }

  return hotelId || undefined;
}

function buildRankingRange(query: DashboardQuery) {
  if (query.startDate || query.endDate) {
    return {
      gte: query.startDate ? new Date(query.startDate) : undefined,
      lte: query.endDate ? new Date(query.endDate) : undefined
    };
  }

  return {
    gte: startOfMonth(),
    lte: endOfMonth()
  };
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

export async function getDashboardStatistics(
  user: AuthenticatedUser,
  query: DashboardQuery,
  client: DbClient = prisma
) {
  const hotelId = buildScopedHotelId(user, query.hotelId);
  const scope = {
    ...buildOrderScopeWhere(user),
    hotelId
  };
  const todayRange = {
    gte: startOfToday(),
    lte: endOfToday()
  };
  const monthRange = {
    gte: startOfMonth(),
    lte: endOfMonth()
  };
  const rankingRange = buildRankingRange(query);

  const [
    todayNewOrders,
    todayPendingDispatch,
    todayInService,
    todayCompleted,
    todayRejectCount,
    idleButlers,
    workingButlers,
    leaveButlers,
    monthOrders,
    monthCompletedOrders,
    monthReviews,
    monthAssignments,
    monthRejects,
    pendingReviewOrders,
    pendingSettlementOrders,
    orderStatusOverviewRows,
    butlerStatusOverviewRows,
    hotelRankingRows,
    butlerAssignmentRankingRows,
    butlerScoreRankingRows,
    butlerRejectRankingRows
  ] = await Promise.all([
    client.serviceOrder.count({
      where: {
        ...scope,
        createdAt: todayRange
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        status: "pending_dispatch",
        createdAt: todayRange
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        status: "in_service",
        updatedAt: todayRange
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        status: {
          in: ["completed", "reviewed"]
        },
        updatedAt: todayRange
      }
    }),
    client.rejectRecord.count({
      where: {
        createdAt: todayRange,
        order: {
          hotelId
        }
      }
    }),
    client.butler.count({
      where: {
        status: "available"
      }
    }),
    client.butler.count({
      where: {
        status: "in_service"
      }
    }),
    client.butler.count({
      where: {
        status: "on_leave"
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        createdAt: monthRange
      }
    }),
    client.serviceOrder.findMany({
      where: {
        ...scope,
        status: {
          in: ["pending_review", "reviewed", "completed"]
        },
        updatedAt: monthRange
      },
      select: {
        guestCount: true,
        id: true
      }
    }),
    client.serviceReview.findMany({
      where: {
        createdAt: monthRange,
        order: {
          hotelId
        }
      },
      select: {
        overallScore: true
      }
    }),
    client.orderButlerAssignment.count({
      where: {
        assignedAt: monthRange,
        order: {
          hotelId
        }
      }
    }),
    client.rejectRecord.count({
      where: {
        createdAt: monthRange,
        order: {
          hotelId
        }
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        status: "pending_review"
      }
    }),
    client.serviceOrder.count({
      where: {
        ...scope,
        settlementStatus: "unsettled"
      }
    }),
    client.serviceOrder.groupBy({
      by: ["status"],
      where: scope,
      _count: {
        _all: true
      }
    }),
    client.butler.groupBy({
      by: ["status"],
      _count: {
        _all: true
      }
    }),
    client.serviceOrder.groupBy({
      by: ["hotelId"],
      where: {
        ...scope,
        createdAt: rankingRange
      },
      _count: {
        _all: true
      }
    }),
    client.orderButlerAssignment.groupBy({
      by: ["butlerId"],
      where: {
        assignedAt: rankingRange,
        order: {
          hotelId
        }
      },
      _count: {
        _all: true
      }
    }),
    client.serviceReview.groupBy({
      by: ["butlerId"],
      where: {
        createdAt: rankingRange,
        order: {
          hotelId
        }
      },
      _avg: {
        overallScore: true
      },
      _count: {
        _all: true
      }
    }),
    client.rejectRecord.groupBy({
      by: ["butlerId"],
      where: {
        createdAt: rankingRange,
        order: {
          hotelId
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const hotelIds = hotelRankingRows.map((item) => item.hotelId);
  const butlerIds = Array.from(
    new Set([
      ...butlerAssignmentRankingRows.map((item) => item.butlerId),
      ...butlerScoreRankingRows.map((item) => item.butlerId),
      ...butlerRejectRankingRows.map((item) => item.butlerId)
    ])
  );

  const [hotels, butlers] = await Promise.all([
    hotelIds.length > 0
      ? client.hotel.findMany({
          where: {
            id: {
              in: hotelIds
            }
          },
          select: {
            id: true,
            name: true
          }
        })
      : Promise.resolve([]),
    butlerIds.length > 0
      ? client.butler.findMany({
          where: {
            id: {
              in: butlerIds
            }
          },
          select: {
            id: true,
            name: true,
            phone: true
          }
        })
      : Promise.resolve([])
  ]);

  const hotelMap = new Map(hotels.map((hotel) => [hotel.id, hotel.name]));
  const butlerMap = new Map(
    butlers.map((butler) => [
      butler.id,
      { name: butler.name, phone: butler.phone }
    ])
  );

  const monthGuestCount = monthCompletedOrders.reduce(
    (sum, order) => sum + order.guestCount,
    0
  );
  const monthAverageScore =
    monthReviews.length > 0
      ? round2(
          monthReviews.reduce((sum, review) => sum + review.overallScore, 0) /
            monthReviews.length
        )
      : 0;
  const monthRejectRate = monthAssignments > 0 ? round2(monthRejects / monthAssignments) : 0;
  const monthCompletedOrderCount = monthCompletedOrders.length;
  const monthCompletionRate = monthOrders > 0 ? round2(monthCompletedOrderCount / monthOrders) : 0;

  return {
    cards: {
      todayNewOrders,
      todayPendingDispatch,
      todayInService,
      todayCompleted,
      todayRejectCount,
      idleButlers,
      workingButlers,
      leaveButlers,
      monthOrders,
      monthGuestCount,
      monthAverageScore,
      monthRejectRate,
      monthCompletionRate,
      pendingReviewOrders,
      pendingSettlementOrders
    },
    orderStatusOverview: orderStatusOverviewRows.map((item) => ({
      status: item.status,
      count: item._count._all
    })),
    butlerStatusOverview: butlerStatusOverviewRows.map((item) => ({
      status: item.status,
      count: item._count._all
    })),
    rankings: {
      hotelOrders: hotelRankingRows
        .map((item) => ({
          id: item.hotelId,
          name: hotelMap.get(item.hotelId) ?? item.hotelId,
          value: item._count._all
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      butlerOrders: butlerAssignmentRankingRows
        .map((item) => ({
          id: item.butlerId,
          name: butlerMap.get(item.butlerId)?.name ?? item.butlerId,
          value: item._count._all
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      butlerScores: butlerScoreRankingRows
        .map((item) => ({
          id: item.butlerId,
          name: butlerMap.get(item.butlerId)?.name ?? item.butlerId,
          value: round2(item._avg.overallScore ?? 0),
          reviewCount: item._count._all
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      butlerRejects: butlerRejectRankingRows
        .map((item) => ({
          id: item.butlerId,
          name: butlerMap.get(item.butlerId)?.name ?? item.butlerId,
          value: item._count._all
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    }
  };
}
