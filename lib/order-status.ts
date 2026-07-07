import {
  AssignmentStatus,
  ButlerStatus,
  OrderStatus,
  Prisma,
  PrismaClient
} from "@prisma/client";
import {
  getOrderServiceEndOfDay,
  getOrderServiceWindow,
  orderOccupyingAssignmentStatuses
} from "@/lib/order-conflicts";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export const activeAssignmentStatuses: AssignmentStatus[] = [
  ...orderOccupyingAssignmentStatuses
];

export const servingAssignmentStatuses: AssignmentStatus[] = [
  "picked_guest",
  "in_service"
];

export const completableAssignmentStatuses: AssignmentStatus[] = [
  "confirmed",
  "picked_guest",
  "in_service"
];

type StatusContext = {
  operatorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  remark?: string | null;
};

export async function updateOrderStatusAfterDispatch(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  return updateOrderStatus(orderId, "pending_confirm", client, {
    ...context,
    remark: context?.remark ?? "派单后订单进入待确认"
  });
}

export async function updateOrderStatusAfterConfirm(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  const counts = await client.orderButlerAssignment.groupBy({
    by: ["status"],
    where: {
      orderId,
      status: {
        in: ["pending_confirm", "confirmed", "picked_guest", "in_service"]
      }
    },
    _count: true
  });

  const pendingCount =
    counts.find((item) => item.status === "pending_confirm")?._count ?? 0;
  const confirmedCount = counts
    .filter((item) => item.status !== "pending_confirm")
    .reduce((sum, item) => sum + item._count, 0);

  if (pendingCount === 0 && confirmedCount > 0) {
    return updateOrderStatus(orderId, "confirmed", client, {
      ...context,
      remark: context?.remark ?? "所有待确认管家已确认"
    });
  }

  return null;
}

export async function updateOrderStatusAfterReject(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  return updateOrderStatus(orderId, "partial_rejected", client, {
    ...context,
    remark: context?.remark ?? "管家拒单后订单进入部分拒单"
  });
}

export async function updateOrderStatusAfterCancelDispatch(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  const counts = await client.orderButlerAssignment.groupBy({
    by: ["status"],
    where: {
      orderId,
      status: {
        in: ["pending_confirm", "confirmed", "picked_guest", "in_service"]
      }
    },
    _count: true
  });

  const count = (status: AssignmentStatus) =>
    counts.find((item) => item.status === status)?._count ?? 0;
  const pendingCount = count("pending_confirm");
  const confirmedCount = count("confirmed");
  const servingCount = count("picked_guest") + count("in_service");

  if (pendingCount > 0) {
    return updateOrderStatus(orderId, "pending_confirm", client, {
      ...context,
      remark: context?.remark ?? "取消部分派单后仍有管家待接单"
    });
  }

  if (servingCount > 0) {
    return updateOrderStatus(orderId, "in_service", client, {
      ...context,
      remark: context?.remark ?? "取消派单后订单仍有管家服务中"
    });
  }

  if (confirmedCount > 0) {
    return updateOrderStatus(orderId, "confirmed", client, {
      ...context,
      remark: context?.remark ?? "取消派单后订单仍有管家已接单"
    });
  }

  return updateOrderStatus(orderId, "pending_dispatch", client, {
    ...context,
    remark: context?.remark ?? "取消全部待接单派单后订单回到待分配"
  });
}

export async function updateOrderStatusAfterPickedGuest(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  return updateOrderStatus(orderId, "in_service", client, {
    ...context,
    remark: context?.remark ?? "管家已接到客人，订单进入服务中"
  });
}

export async function updateOrderStatusAfterComplete(
  orderId: string,
  client: DbClient = prisma,
  context?: StatusContext
) {
  const assignments = await client.orderButlerAssignment.findMany({
    where: {
      orderId,
      status: {
        notIn: ["rejected", "reassigned", "abnormal"]
      }
    },
    select: {
      status: true
    }
  });

  const completedCount = assignments.filter(
    (assignment) => assignment.status === "completed"
  ).length;
  const unfinishedCount = assignments.filter(
    (assignment) => assignment.status !== "completed"
  ).length;

  if (assignments.length === 0 || completedCount === 0) {
    return null;
  }

  if (unfinishedCount > 0) {
    return updateOrderStatus(orderId, "partial_completed", client, {
      ...context,
      remark: context?.remark ?? "部分管家已确认服务完成"
    });
  }

  return updateOrderStatus(orderId, "pending_review", client, {
    ...context,
    remark: context?.remark ?? "全部管家完成服务后订单进入待评价"
  });
}

export async function refreshButlerStatus(
  butlerId: string,
  client: DbClient = prisma
) {
  const butler = await client.butler.findUnique({
    where: { id: butlerId },
    select: { status: true }
  });

  if (!butler) {
    return null;
  }

  if (butler.status === "disabled") {
    return butler;
  }

  const now = new Date();
  const activeLeave = await client.butlerLeave.findFirst({
    where: {
      butlerId,
      status: {
        in: ["approved", "active"]
      },
      startAt: {
        lte: now
      },
      endAt: {
        gt: now
      }
    },
    select: {
      id: true
    }
  });

  if (activeLeave) {
    if (butler.status === "on_leave") {
      return butler;
    }

    return client.butler.update({
      where: { id: butlerId },
      data: { status: "on_leave" },
      select: { status: true }
    });
  }

  const assignments = await client.orderButlerAssignment.findMany({
    where: {
      butlerId,
      status: {
        in: activeAssignmentStatuses
      }
    },
    select: {
      status: true,
      order: {
        select: {
          arrivalTime: true,
          checkInDate: true,
          checkOutDate: true
        }
      }
    }
  });
  const currentAssignments = assignments.filter((assignment) =>
    isCurrentAssignmentForStatus(assignment, now)
  );

  let nextStatus: ButlerStatus = "available";

  if (currentAssignments.some((item) => servingAssignmentStatuses.includes(item.status))) {
    nextStatus = "in_service";
  } else if (currentAssignments.some((item) => item.status === "pending_confirm")) {
    nextStatus = "pending_confirm";
  } else if (currentAssignments.some((item) => item.status === "confirmed")) {
    nextStatus = "confirmed_waiting";
  }

  if (nextStatus === butler.status) {
    return butler;
  }

  return client.butler.update({
    where: { id: butlerId },
    data: { status: nextStatus },
    select: { status: true }
  });
}

/** 用于停用账号等高风险操作，不能让仍承担订单的管家直接退出服务。 */
export async function findButlerActiveAssignments(
  butlerId: string,
  client: DbClient = prisma
) {
  const now = new Date();
  const assignments = await client.orderButlerAssignment.findMany({
    where: {
      butlerId,
      status: { in: activeAssignmentStatuses },
      order: {
        status: {
          notIn: ["cancelled", "abnormal", "pending_review", "reviewed", "completed"]
        }
      }
    },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          arrivalTime: true,
          checkInDate: true,
          checkOutDate: true,
          status: true
        }
      }
    },
    orderBy: { order: { arrivalTime: "asc" } }
  });

  return assignments.filter((assignment) =>
    isCurrentAssignmentForStatus(assignment, now)
  );
}

function isCurrentAssignmentForStatus(
  assignment: {
    status: AssignmentStatus;
    order: {
      arrivalTime: Date;
      checkInDate: Date;
      checkOutDate: Date;
    };
  },
  now: Date
) {
  if (assignment.status === "pending_confirm") {
    return getOrderServiceWindow(assignment.order).startAt >= now;
  }

  if (assignment.status === "confirmed") {
    return getOrderServiceEndOfDay(assignment.order) >= now;
  }

  return servingAssignmentStatuses.includes(assignment.status);
}

async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  client: DbClient,
  context?: StatusContext
) {
  const before = await client.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true
    }
  });

  if (!before || before.status === nextStatus) {
    return before;
  }

  const after = await client.serviceOrder.update({
    where: { id: orderId },
    data: { status: nextStatus },
    select: {
      id: true,
      orderNo: true,
      status: true
    }
  });

  await client.operationLog.create({
    data: {
      operatorId: context?.operatorId ?? null,
      operationType: "ORDER_STATUS_CHANGE",
      targetType: "ServiceOrder",
      targetId: orderId,
      beforeData: toJson(before),
      afterData: toJson(after),
      remark: context?.remark ?? null,
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
