import type { AssignmentStatus, OrderStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

const currentTaskStatusRank: Record<string, number> = {
  in_service: 0,
  picked_guest: 1,
  confirmed: 2,
  pending_confirm: 3
};

const scheduledTaskStatuses: AssignmentStatus[] = ["pending_confirm", "confirmed"];
const startedTaskStatuses: AssignmentStatus[] = ["picked_guest", "in_service"];
const activeTaskStatuses: AssignmentStatus[] = [
  ...scheduledTaskStatuses,
  ...startedTaskStatuses
];
const inactiveOrderStatuses: OrderStatus[] = [
  "cancelled",
  "abnormal",
  "pending_review",
  "reviewed",
  "completed"
];

const SHANGHAI_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function getShanghaiDayRange(now = new Date()) {
  const shanghaiNow = new Date(now.getTime() + SHANGHAI_UTC_OFFSET_MS);
  const today = new Date(
    Date.UTC(
      shanghaiNow.getUTCFullYear(),
      shanghaiNow.getUTCMonth(),
      shanghaiNow.getUTCDate()
    ) - SHANGHAI_UTC_OFFSET_MS
  );

  return {
    today,
    tomorrow: new Date(today.getTime() + DAY_MS)
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);
  if (!user) return response;
  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const { today, tomorrow } = getShanghaiDayRange();

    const [butler, todayTaskCount, pendingCount, readyCount, inServiceCount, unreadCount, currentTasks] =
      await Promise.all([
        prisma.butler.findUnique({
          where: { id: user.butlerId },
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            averageScore: true,
            vehicleInfo: true
          }
        }),
        prisma.orderButlerAssignment.count({
          where: {
            butlerId: user.butlerId,
            order: {
              status: { notIn: inactiveOrderStatuses }
            },
            OR: [
              {
                status: { in: startedTaskStatuses }
              },
              {
                status: { in: scheduledTaskStatuses },
                order: {
                  checkOutDate: { gte: today },
                  OR: [
                    { arrivalTime: { lt: tomorrow } },
                    { checkInDate: { lt: tomorrow } }
                  ]
                }
              }
            ]
          }
        }),
        prisma.orderButlerAssignment.count({
          where: { butlerId: user.butlerId, status: "pending_confirm" }
        }),
        prisma.orderButlerAssignment.count({
          where: { butlerId: user.butlerId, status: "confirmed" }
        }),
        prisma.orderButlerAssignment.count({
          where: {
            butlerId: user.butlerId,
            status: { in: ["picked_guest", "in_service"] }
          }
        }),
        prisma.notification.count({
          where: { recipientId: user.id, isRead: false }
        }),
        prisma.orderButlerAssignment.findMany({
          where: {
            butlerId: user.butlerId,
            status: { in: activeTaskStatuses },
            order: {
              status: { notIn: inactiveOrderStatuses }
            }
          },
          include: {
            order: {
              include: {
                hotel: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        })
      ]);
    const orderedCurrentTasks = currentTasks.sort((prev, next) => {
      const prevRank = currentTaskStatusRank[prev.status] ?? 99;
      const nextRank = currentTaskStatusRank[next.status] ?? 99;
      if (prevRank !== nextRank) return prevRank - nextRank;

      const prevArrival = prev.order.arrivalTime?.getTime() ?? 0;
      const nextArrival = next.order.arrivalTime?.getTime() ?? 0;
      if (prevArrival !== nextArrival) return prevArrival - nextArrival;

      return next.updatedAt.getTime() - prev.updatedAt.getTime();
    });

    return successResponse({
      butler,
      cards: {
        todayTaskCount,
        pendingCount,
        readyCount,
        inServiceCount,
        unreadCount
      },
      currentTask: orderedCurrentTasks[0] ?? null,
      currentTasks: orderedCurrentTasks
    });
  } catch (error) {
    return handleApiError(error);
  }
}
