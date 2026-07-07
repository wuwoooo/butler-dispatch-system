import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

const groupMap = {
  pending: new Set(["pending_confirm"]),
  confirmedWaiting: new Set(["confirmed"]),
  inService: new Set(["picked_guest", "in_service"]),
  completed: new Set(["completed"]),
  rejected: new Set(["rejected"])
};

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const assignments = await prisma.orderButlerAssignment.findMany({
      where: { butlerId: user.butlerId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            hotel: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        },
        butler: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        }
      }
    });

    return successResponse({
      groups: {
        pending: assignments.filter((item) => groupMap.pending.has(item.status)),
        confirmedWaiting: assignments.filter((item) =>
          groupMap.confirmedWaiting.has(item.status)
        ),
        inService: assignments.filter((item) =>
          groupMap.inService.has(item.status)
        ),
        completed: assignments.filter((item) =>
          groupMap.completed.has(item.status)
        ),
        rejected: assignments.filter((item) => groupMap.rejected.has(item.status))
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
