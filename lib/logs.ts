import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";

type DbClient = Prisma.TransactionClient | PrismaClient;

type LogsQuery = {
  page?: number;
  pageSize?: number;
  operatorId?: string;
  operatorRole?: string;
  operationType?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
};

const dispatcherTargetTypes = [
  "ServiceOrder",
  "OrderButlerAssignment",
  "RejectRecord",
  "ButlerLeave",
  "ServiceReview",
  "AbnormalRecord"
];

const financeOperationKeywords = ["EXPORT_", "SETTLEMENT", "FINANCE", "STATISTICS"];

export async function getOperationLogs(
  user: AuthenticatedUser,
  query: LogsQuery,
  client: DbClient = prisma
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.OperationLogWhereInput = {
    operatorId: query.operatorId || undefined,
    operationType: query.operationType
      ? { contains: query.operationType }
      : undefined,
    targetType: query.targetType ? { contains: query.targetType } : undefined,
    targetId: query.targetId ? { contains: query.targetId } : undefined,
    createdAt:
      query.startDate || query.endDate
        ? {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined
          }
        : undefined,
    operator: query.operatorRole
      ? {
          roleCode: query.operatorRole as never
        }
      : undefined,
    OR: query.keyword
      ? [
          { remark: { contains: query.keyword } },
          { operationType: { contains: query.keyword } },
          { targetType: { contains: query.keyword } },
          { targetId: { contains: query.keyword } }
        ]
      : undefined
  };

  if (user.roleCode === "dispatcher") {
    where.targetType = {
      in: dispatcherTargetTypes
    };
  }

  if (user.roleCode === "finance") {
    where.OR = [
      ...(where.OR ?? []),
      ...financeOperationKeywords.map((keyword) => ({
        operationType: {
          contains: keyword
        }
      })),
      { targetType: { in: ["ServiceOrder", "ServiceReview", "ButlerLeave"] } }
    ];
  }

  const [items, total] = await Promise.all([
    client.operationLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        operator: {
          select: {
            id: true,
            username: true,
            name: true,
            roleCode: true
          }
        }
      }
    }),
    client.operationLog.count({ where })
  ]);

  return {
    items,
    total
  };
}
