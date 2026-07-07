import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);
  if (!user) return response;
  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [butler, todayTaskCount, pendingCount, readyCount, inServiceCount, unreadCount, currentTask] =
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
              arrivalTime: {
                gte: today,
                lt: tomorrow
              }
            }
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
        prisma.orderButlerAssignment.findFirst({
          where: {
            butlerId: user.butlerId,
            status: { in: ["picked_guest", "in_service", "confirmed", "pending_confirm"] }
          },
          orderBy: { updatedAt: "desc" },
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

    return successResponse({
      butler,
      cards: {
        todayTaskCount,
        pendingCount,
        readyCount,
        inServiceCount,
        unreadCount
      },
      currentTask
    });
  } catch (error) {
    return handleApiError(error);
  }
}

