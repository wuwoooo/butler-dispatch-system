import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";

type DbClient = Prisma.TransactionClient | PrismaClient;

type AbnormalListQuery = {
  page?: number;
  pageSize?: number;
  orderId?: string;
  butlerId?: string;
  abnormalType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
};

export function buildAbnormalScopeWhere(user: AuthenticatedUser): Prisma.AbnormalRecordWhereInput {
  if (user.roleCode === "hotel_frontdesk") {
    return {
      order: {
        hotelId: user.hotelId ?? "__none__"
      }
    };
  }

  if (user.roleCode === "butler") {
    return {
      butlerId: user.butlerId ?? "__none__"
    };
  }

  return {};
}

export async function getAbnormalRecords(
  user: AuthenticatedUser,
  query: AbnormalListQuery,
  client: DbClient = prisma
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.AbnormalRecordWhereInput = {
    ...buildAbnormalScopeWhere(user),
    orderId: query.orderId || undefined,
    butlerId: query.butlerId || undefined,
    abnormalType: query.abnormalType ? { contains: query.abnormalType } : undefined,
    status: query.status as never,
    createdAt:
      query.startDate || query.endDate
        ? {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined
          }
        : undefined,
    OR: query.keyword
      ? [
          { description: { contains: query.keyword } },
          { abnormalType: { contains: query.keyword } }
        ]
      : undefined
  };

  const [items, total] = await Promise.all([
    client.abnormalRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            roomType: true,
            roomNo: true,
            hotel: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        butler: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            roleCode: true
          }
        },
        handledBy: {
          select: {
            id: true,
            username: true,
            name: true,
            roleCode: true
          }
        }
      }
    }),
    client.abnormalRecord.count({ where })
  ]);

  return {
    items,
    total
  };
}
