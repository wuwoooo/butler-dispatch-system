import { Prisma, PrismaClient } from "@prisma/client";
import { calcLeaveDaysInRange } from "@/lib/leaves";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export type StatisticsRangeInput = {
  range?: "today" | "week" | "month" | "year" | "all" | "custom";
  startTime?: string;
  endTime?: string;
};

export type ButlerStatistics = {
  orderCount: number;
  completedOrderCount: number;
  guestCount: number;
  rejectCount: number;
  rejectRate: number;
  averageScore: number;
  goodReviewRate: number;
  leaveDays: number;
  reviewCount: number;
};

export function resolveStatisticsRange(input: StatisticsRangeInput) {
  const now = new Date();
  const range = input.range ?? "month";
  let start: Date;
  let end: Date;

  if (range === "custom" && input.startTime && input.endTime) {
    start = new Date(input.startTime);
    end = new Date(input.endTime);
  } else if (range === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (range === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (range === "year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (range === "all") {
    start = new Date(1970, 0, 1, 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export async function getButlerStatistics(
  butlerId: string,
  rangeInput: StatisticsRangeInput,
  options: { hotelId?: string } = {},
  client: DbClient = prisma
): Promise<ButlerStatistics> {
  const { start, end } = resolveStatisticsRange(rangeInput);
  const orderFilter = options.hotelId
    ? {
        hotelId: options.hotelId
      }
    : undefined;

  const [orderCount, completedAssignments, rejectCount, reviews, leaves] =
    await Promise.all([
      client.orderButlerAssignment.count({
        where: {
          butlerId,
          assignedAt: {
            gte: start,
            lte: end
          },
          order: orderFilter
        }
      }),
      client.orderButlerAssignment.findMany({
        where: {
          butlerId,
          status: "completed",
          completedAt: {
            gte: start,
            lte: end
          },
          order: orderFilter
        },
        select: {
          id: true,
          order: {
            select: {
              guestCount: true
            }
          }
        }
      }),
      client.rejectRecord.count({
        where: {
          butlerId,
          createdAt: {
            gte: start,
            lte: end
          },
          order: orderFilter
        }
      }),
      client.serviceReview.findMany({
        where: {
          butlerId,
          createdAt: {
            gte: start,
            lte: end
          },
          order: orderFilter
        },
        select: {
          overallScore: true
        }
      }),
      client.butlerLeave.findMany({
        where: {
          butlerId,
          status: {
            in: ["approved", "active", "finished"]
          },
          startAt: {
            lt: end
          },
          endAt: {
            gt: start
          }
        },
        select: {
          startAt: true,
          endAt: true
        }
      })
    ]);

  const completedOrderCount = completedAssignments.length;
  const guestCount = completedAssignments.reduce(
    (sum, assignment) => sum + assignment.order.guestCount,
    0
  );
  const reviewCount = reviews.length;
  const averageScore =
    reviewCount > 0
      ? round2(
          reviews.reduce((sum, review) => sum + review.overallScore, 0) /
            reviewCount
        )
      : 0;
  const goodReviewRate =
    reviewCount > 0
      ? round2(
          reviews.filter((review) => review.overallScore >= 4).length /
            reviewCount
        )
      : 0;

  return {
    orderCount,
    completedOrderCount,
    guestCount,
    rejectCount,
    rejectRate: orderCount > 0 ? round2(rejectCount / orderCount) : 0,
    averageScore,
    goodReviewRate,
    leaveDays: calcLeaveDaysInRange(leaves, start, end),
    reviewCount
  };
}

export async function getButlerStatisticsRows(
  rangeInput: StatisticsRangeInput,
  options: { butlerId?: string; hotelId?: string } = {},
  client: DbClient = prisma
) {
  const butlers = await client.butler.findMany({
    where: {
      id: options.butlerId || undefined
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      status: true,
      averageScore: true,
      reviewCount: true
    }
  });

  return Promise.all(
    butlers.map(async (butler) => {
      const statistics = await getButlerStatistics(
        butler.id,
        rangeInput,
        { hotelId: options.hotelId },
        client
      );

      return {
        butlerId: butler.id,
        code: butler.code,
        name: butler.name,
        phone: butler.phone,
        status: butler.status,
        storedAverageScore: Number(butler.averageScore),
        storedReviewCount: butler.reviewCount,
        ...statistics
      };
    })
  );
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
