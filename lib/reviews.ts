import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

type ReviewStatusContext = {
  operatorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  remark?: string | null;
};

export async function refreshButlerReviewStats(
  butlerId: string,
  client: DbClient = prisma
) {
  const aggregate = await client.serviceReview.aggregate({
    where: { butlerId },
    _avg: {
      overallScore: true
    },
    _count: {
      _all: true
    }
  });

  const averageScore = Number((aggregate._avg.overallScore ?? 0).toFixed(2));

  return client.butler.update({
    where: { id: butlerId },
    data: {
      averageScore,
      reviewCount: aggregate._count._all
    },
    select: {
      id: true,
      averageScore: true,
      reviewCount: true
    }
  });
}

export async function refreshOrderReviewStatus(
  orderId: string,
  client: DbClient = prisma,
  context?: ReviewStatusContext
) {
  const before = await client.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true
    }
  });

  if (!before || before.status !== "pending_review") {
    return before;
  }

  const reviewCount = await client.serviceReview.count({
    where: { orderId }
  });

  if (reviewCount === 0) {
    return before;
  }

  // 当前阶段只要已有评价即可标记 reviewed；后续可扩展为所有参与管家均完成前台和调配员评价才 reviewed。
  const after = await client.serviceOrder.update({
    where: { id: orderId },
    data: { status: "reviewed" },
    select: {
      id: true,
      orderNo: true,
      status: true
    }
  });

  await client.operationLog.create({
    data: {
      operatorId: context?.operatorId ?? null,
      operationType: "ORDER_REVIEW_STATUS_CHANGE",
      targetType: "ServiceOrder",
      targetId: orderId,
      beforeData: toJson(before),
      afterData: toJson(after),
      remark: context?.remark ?? "订单已有评价，状态更新为已评价",
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null
    }
  });

  return after;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
