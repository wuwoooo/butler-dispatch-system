import { LeaveStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  getOrderServiceWindow,
  orderOccupyingAssignmentStatuses,
  timeWindowsOverlap
} from "@/lib/order-conflicts";
import { refreshButlerStatus } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export const activeLeaveStatuses: LeaveStatus[] = [
  "pending",
  "approved",
  "active"
];

export const leaveTypeLabels: Record<string, string> = {
  personal: "事假",
  sick: "病假",
  rest: "休息",
  other: "其他",
  personal_leave: "事假",
  sick_leave: "病假"
};

export const leaveStatusLabels: Record<LeaveStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  cancelled: "已撤销",
  active: "请假中",
  finished: "已结束"
};

export function buildOverlapWhere(startAt: Date, endAt: Date) {
  return {
    startAt: {
      lt: endAt
    },
    endAt: {
      gt: startAt
    }
  };
}

export async function findLeaveOrderConflicts(
  butlerId: string,
  startAt: Date,
  endAt: Date,
  client: DbClient = prisma
) {
  return client.orderButlerAssignment.findMany({
    where: {
      butlerId,
      status: {
        in: orderOccupyingAssignmentStatuses
      },
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
          hotel: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      order: {
        arrivalTime: "asc"
      }
    }
  }).then((assignments) =>
    assignments.filter((assignment) =>
      timeWindowsOverlap(
        { startAt, endAt },
        getOrderServiceWindow(assignment.order)
      )
    )
  );
}

export async function findOverlappingLeaves(
  butlerId: string,
  startAt: Date,
  endAt: Date,
  client: DbClient = prisma,
  excludeId?: string
) {
  return client.butlerLeave.findMany({
    where: {
      butlerId,
      id: excludeId ? { not: excludeId } : undefined,
      status: {
        in: activeLeaveStatuses
      },
      ...buildOverlapWhere(startAt, endAt)
    },
    select: {
      id: true,
      leaveType: true,
      reason: true,
      startAt: true,
      endAt: true,
      status: true
    },
    orderBy: {
      startAt: "asc"
    }
  });
}

export async function refreshLeaveStatuses(client: DbClient = prisma) {
  const now = new Date();
  const leaves = await client.butlerLeave.findMany({
    where: {
      OR: [
        {
          status: "approved",
          startAt: {
            lte: now
          }
        },
        {
          status: "active",
          endAt: {
            lt: now
          }
        }
      ]
    },
    select: {
      id: true,
      butlerId: true,
      status: true,
      startAt: true,
      endAt: true
    }
  });

  const changedButlerIds = new Set<string>();

  for (const leave of leaves) {
    const nextStatus =
      leave.endAt < now ? "finished" : ("active" as LeaveStatus);

    if (leave.status !== nextStatus) {
      await client.butlerLeave.update({
        where: { id: leave.id },
        data: { status: nextStatus }
      });
      changedButlerIds.add(leave.butlerId);
    }
  }

  await Promise.all(
    Array.from(changedButlerIds).map((butlerId) =>
      refreshButlerStatus(butlerId, client)
    )
  );

  return {
    refreshedLeaveCount: leaves.length,
    refreshedButlerCount: changedButlerIds.size
  };
}

export function calcLeaveDaysInRange(
  leaves: Array<{ startAt: Date; endAt: Date }>,
  rangeStart: Date,
  rangeEnd: Date
) {
  const milliseconds = leaves.reduce((sum, leave) => {
    const start = Math.max(leave.startAt.getTime(), rangeStart.getTime());
    const end = Math.min(leave.endAt.getTime(), rangeEnd.getTime());

    if (end <= start) {
      return sum;
    }

    return sum + (end - start);
  }, 0);

  return Number((milliseconds / 86_400_000).toFixed(2));
}
