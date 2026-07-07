import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";

type DbClient = Prisma.TransactionClient | PrismaClient;

type NotificationQuery = {
  page?: number;
  pageSize?: number;
  readStatus?: "read" | "unread";
  notificationType?: string;
  startDate?: string;
  endDate?: string;
};

export async function getNotificationList(
  user: AuthenticatedUser,
  query: NotificationQuery,
  client: DbClient = prisma
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.NotificationWhereInput = {
    recipientId: user.id,
    type: query.notificationType || undefined,
    isRead:
      query.readStatus === "read"
        ? true
        : query.readStatus === "unread"
          ? false
          : undefined,
    createdAt:
      query.startDate || query.endDate
        ? {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined
          }
        : undefined
  };

  const [items, total] = await Promise.all([
    client.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }
    }),
    client.notification.count({ where })
  ]);

  return {
    items,
    total
  };
}

export async function getUnreadNotificationCount(
  user: AuthenticatedUser,
  client: DbClient = prisma
) {
  return client.notification.count({
    where: {
      recipientId: user.id,
      isRead: false
    }
  });
}
