import { AssignmentStatus, OrderStatus, Prisma } from "@prisma/client";
import {
  getOrderServiceEndOfDay,
  getOrderServiceWindow
} from "@/lib/order-conflicts";
import { activeAssignmentStatuses, refreshButlerStatus } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

const terminalOrderStatuses: OrderStatus[] = [
  "cancelled",
  "abnormal",
  "pending_review",
  "reviewed",
  "completed"
];

const activeOrderStatuses: OrderStatus[] = [
  "pending_dispatch",
  "pending_confirm",
  "partial_rejected",
  "confirmed",
  "in_service",
  "partial_completed"
];

type OverdueAssignment = {
  id: string;
  status: AssignmentStatus;
  orderId: string;
  butlerId: string;
  assignedAt: Date;
  confirmedAt: Date | null;
  order: {
    id: string;
    orderNo: string;
    status: OrderStatus;
    serviceMode: "stay" | "transport";
    guestName: string;
    serviceStartAt: Date;
    serviceEndAt: Date;
    arrivalTime: Date;
    checkInDate: Date;
    checkOutDate: Date;
    roomType: string | null;
    roomNo: string | null;
    hotel: {
      name: string;
    };
  };
  butler: {
    id: string;
    name: string;
  };
};

type OverdueResolution = {
  dryRun?: boolean;
  now?: Date;
};

export async function resolveOverdueAssignments(options: OverdueResolution = {}) {
  const now = options.now ?? new Date();
  const candidates = await prisma.orderButlerAssignment.findMany({
    where: {
      status: { in: ["pending_confirm", "confirmed"] },
      order: {
        status: { in: activeOrderStatuses }
      }
    },
    select: {
      id: true,
      status: true,
      orderId: true,
      butlerId: true,
      assignedAt: true,
      confirmedAt: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          serviceMode: true,
          guestName: true,
          serviceStartAt: true,
          serviceEndAt: true,
          arrivalTime: true,
          checkInDate: true,
          checkOutDate: true,
          roomType: true,
          roomNo: true,
          hotel: {
            select: {
              name: true
            }
          }
        }
      },
      butler: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const overdueItems = candidates.filter((assignment) =>
    isAssignmentOverdue(assignment, now)
  );

  if (options.dryRun) {
    return {
      scanned: candidates.length,
      processed: 0,
      skipped: 0,
      items: overdueItems.map(toPreview)
    };
  }

  let processed = 0;
  let skipped = 0;
  const affectedButlerIds = new Set<string>();
  const affectedOrderIds = new Set<string>();

  for (const assignment of overdueItems) {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderButlerAssignment.updateMany({
        where: {
          id: assignment.id,
          status: assignment.status
        },
        data: {
          status: "abnormal",
          remark: buildAssignmentRemark(assignment, now)
        }
      });

      if (updated.count === 0) {
        return false;
      }

      await createOverdueAbnormalRecord(tx, assignment, now);
      await refreshOrderStatusAfterAssignmentAbnormal(assignment.orderId, tx);
      await tx.operationLog.create({
        data: {
          operationType: "RESOLVE_OVERDUE_ASSIGNMENT",
          targetType: "OrderButlerAssignment",
          targetId: assignment.id,
          beforeData: toJson({
            status: assignment.status,
            orderStatus: assignment.order.status
          }),
          afterData: toJson({
            status: "abnormal",
            abnormalType: getAbnormalType(assignment)
          }),
          remark: getAbnormalDescription(assignment, now)
        }
      });

      return true;
    });

    if (result) {
      processed += 1;
      affectedButlerIds.add(assignment.butlerId);
      affectedOrderIds.add(assignment.orderId);
    } else {
      skipped += 1;
    }
  }

  await Promise.all(
    Array.from(affectedButlerIds).map((butlerId) =>
      refreshButlerStatus(butlerId, prisma)
    )
  );

  return {
    scanned: candidates.length,
    processed,
    skipped,
    affectedButlerIds: Array.from(affectedButlerIds),
    affectedOrderIds: Array.from(affectedOrderIds),
    items: overdueItems.map(toPreview)
  };
}

function isAssignmentOverdue(assignment: OverdueAssignment, now: Date) {
  if (assignment.status === "pending_confirm") {
    return getOrderServiceWindow(assignment.order).startAt < now;
  }

  if (assignment.status === "confirmed") {
    return getOrderServiceEndOfDay(assignment.order) < now;
  }

  return false;
}

function getAbnormalType(assignment: OverdueAssignment) {
  return assignment.status === "pending_confirm"
    ? "assignment_confirm_timeout"
    : "assignment_service_overdue";
}

function getAbnormalTitle(assignment: OverdueAssignment) {
  return assignment.status === "pending_confirm"
    ? "管家超时未确认"
    : "管家确认后超期未完成";
}

function getAbnormalDescription(assignment: OverdueAssignment, now: Date) {
  const deadline =
    assignment.status === "pending_confirm"
      ? getOrderServiceWindow(assignment.order).startAt
      : getOrderServiceEndOfDay(assignment.order);
  const action =
    assignment.status === "pending_confirm"
      ? assignment.order.serviceMode === "transport"
        ? "未在接送服务开始前确认接单"
        : "未在入住服务开始前确认接单"
      : assignment.order.serviceMode === "transport"
        ? "已确认接单，但到接送服务结束仍未完成服务"
        : "已确认接单，但到离店日结束仍未完成服务";

  return [
    `${getAbnormalTitle(assignment)}：管家 ${assignment.butler.name} ${action}。`,
    `应处理时间：${formatDateTime(deadline)}，发现时间：${formatDateTime(now)}。`
  ].join("");
}

function buildAssignmentRemark(assignment: OverdueAssignment, now: Date) {
  const previous = assignment.status === "pending_confirm" ? "待接单" : "准备接待";
  return `${previous}已超期，系统定时任务于 ${formatDateTime(now)} 标记为异常`;
}

async function createOverdueAbnormalRecord(
  client: Prisma.TransactionClient,
  assignment: OverdueAssignment,
  now: Date
) {
  const abnormalType = getAbnormalType(assignment);
  const existing = await client.abnormalRecord.findFirst({
    where: {
      orderId: assignment.orderId,
      butlerId: assignment.butlerId,
      abnormalType,
      description: {
        contains: assignment.id
      }
    },
    select: { id: true }
  });

  if (existing) {
    return existing;
  }

  return client.abnormalRecord.create({
    data: {
      orderId: assignment.orderId,
      butlerId: assignment.butlerId,
      abnormalType,
      description: getAbnormalDescription(assignment, now)
    },
    select: { id: true }
  });
}

async function refreshOrderStatusAfterAssignmentAbnormal(
  orderId: string,
  client: Prisma.TransactionClient
) {
  const order = await client.serviceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true }
  });

  if (!order || terminalOrderStatuses.includes(order.status)) {
    return null;
  }

  const assignments = await client.orderButlerAssignment.findMany({
    where: { orderId },
    select: { status: true }
  });
  const hasActive = assignments.some((assignment) =>
    activeAssignmentStatuses.includes(assignment.status)
  );

  if (hasActive) {
    return order;
  }

  const hasAbnormal = assignments.some((assignment) => assignment.status === "abnormal");
  if (!hasAbnormal) {
    return order;
  }

  return client.serviceOrder.update({
    where: { id: orderId },
    data: { status: "abnormal" },
    select: { id: true, status: true }
  });
}

function toPreview(assignment: OverdueAssignment) {
  return {
    assignmentId: assignment.id,
    orderId: assignment.orderId,
    orderNo: assignment.order.orderNo,
    butlerId: assignment.butlerId,
    butlerName: assignment.butler.name,
    previousStatus: assignment.status,
    abnormalType: getAbnormalType(assignment)
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function formatDateTime(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
