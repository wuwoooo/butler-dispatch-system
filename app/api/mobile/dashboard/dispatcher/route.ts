import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["dispatcher", "admin"]);
  if (!user) return response;

  try {
    const [
      pendingDispatch,
      pendingConfirm,
      partialRejected,
      inService,
      pendingLeaves,
      idleButlers,
      workingButlers,
      leaveButlers,
      unreadCount,
      priorityOrders
    ] = await Promise.all([
      prisma.serviceOrder.count({ where: { status: "pending_dispatch" } }),
      prisma.serviceOrder.count({ where: { status: "pending_confirm" } }),
      prisma.serviceOrder.count({ where: { status: "partial_rejected" } }),
      prisma.serviceOrder.count({ where: { status: "in_service" } }),
      prisma.butlerLeave.count({ where: { status: "pending" } }),
      prisma.butler.count({ where: { status: "available" } }),
      prisma.butler.count({ where: { status: "in_service" } }),
      prisma.butler.count({ where: { status: "on_leave" } }),
      prisma.notification.count({ where: { recipientId: user.id, isRead: false } }),
      prisma.serviceOrder.findMany({
        where: {
          status: {
            in: ["pending_dispatch", "partial_rejected", "pending_confirm"]
          }
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          hotel: {
            select: {
              id: true,
              name: true
            }
          },
          assignments: {
            include: {
              butler: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  status: true
                }
              }
            }
          }
        }
      })
    ]);

    return successResponse({
      cards: {
        pendingDispatch,
        pendingConfirm,
        partialRejected,
        inService,
        pendingLeaves,
        idleButlers,
        workingButlers,
        leaveButlers,
        unreadCount
      },
      priorityOrders
    });
  } catch (error) {
    return handleApiError(error);
  }
}

