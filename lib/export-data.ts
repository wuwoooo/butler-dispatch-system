import { Prisma, PrismaClient } from "@prisma/client";
import { buildOrderScopeWhere } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";
import { maskPhone } from "@/utils/format";

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function getReviewExportRows(
  user: AuthenticatedUser,
  query: {
    orderId?: string;
    butlerId?: string;
    hotelId?: string;
    reviewerRole?: string;
    complaintFlag?: boolean;
    startTime?: string;
    endTime?: string;
  },
  client: DbClient = prisma
) {
  const where: Prisma.ServiceReviewWhereInput = {
    orderId: query.orderId || undefined,
    butlerId: query.butlerId || undefined,
    reviewerRole: query.reviewerRole as never,
    complaintFlag: query.complaintFlag,
    createdAt:
      query.startTime || query.endTime
        ? {
            gte: query.startTime ? new Date(query.startTime) : undefined,
            lte: query.endTime ? new Date(query.endTime) : undefined
          }
        : undefined,
    order: {
      hotelId:
        user.roleCode === "hotel_frontdesk"
          ? user.hotelId ?? "__none__"
          : query.hotelId || undefined
    }
  };

  return client.serviceReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          orderNo: true,
          hotel: {
            select: {
              name: true
            }
          }
        }
      },
      butler: {
        select: {
          name: true
        }
      },
      reviewer: {
        select: {
          name: true
        }
      }
    }
  });
}

export async function getLeaveExportRows(
  user: AuthenticatedUser,
  query: {
    butlerName?: string;
    butlerPhone?: string;
    status?: string;
    leaveType?: string;
    leaveStartTime?: string;
    leaveEndTime?: string;
    createdStartTime?: string;
    createdEndTime?: string;
  },
  client: DbClient = prisma
) {
  const where: Prisma.ButlerLeaveWhereInput = {
    status: query.status as never,
    leaveType: query.leaveType || undefined,
    startAt:
      query.leaveStartTime || query.leaveEndTime
        ? {
            gte: query.leaveStartTime ? new Date(query.leaveStartTime) : undefined,
            lte: query.leaveEndTime ? new Date(query.leaveEndTime) : undefined
          }
        : undefined,
    createdAt:
      query.createdStartTime || query.createdEndTime
        ? {
            gte: query.createdStartTime
              ? new Date(query.createdStartTime)
              : undefined,
            lte: query.createdEndTime ? new Date(query.createdEndTime) : undefined
          }
        : undefined,
    butler: {
      name: query.butlerName ? { contains: query.butlerName } : undefined,
      phone: query.butlerPhone ? { contains: query.butlerPhone } : undefined
    }
  };

  if (user.roleCode === "butler") {
    where.butlerId = user.butlerId ?? "__none__";
  }

  return client.butlerLeave.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      butler: {
        select: {
          name: true,
          phone: true
        }
      },
      reviewer: {
        select: {
          name: true
        }
      }
    }
  });
}

export async function getRejectionExportRows(
  user: AuthenticatedUser,
  query: {
    orderId?: string;
    butlerId?: string;
    hotelId?: string;
    startDate?: string;
    endDate?: string;
  },
  client: DbClient = prisma
) {
  const where: Prisma.RejectRecordWhereInput = {
    orderId: query.orderId || undefined,
    butlerId: query.butlerId || undefined,
    createdAt:
      query.startDate || query.endDate
        ? {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined
          }
        : undefined,
    order: {
      ...buildOrderScopeWhere(user),
      hotelId:
        user.roleCode === "hotel_frontdesk"
          ? user.hotelId ?? "__none__"
          : query.hotelId || undefined
    }
  };

  return client.rejectRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          orderNo: true,
          hotel: {
            select: {
              name: true
            }
          }
        }
      },
      butler: {
        select: {
          name: true
        }
      },
      createdBy: {
        select: {
          name: true
        }
      }
    }
  });
}

export function maskPhoneValue(phone: string | null | undefined) {
  return maskPhone(phone);
}
