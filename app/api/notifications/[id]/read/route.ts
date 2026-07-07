import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        recipientId: true,
        isRead: true
      }
    });

    if (!notification) {
      return errorResponse("NOTIFICATION_NOT_FOUND", "通知不存在", 404);
    }

    if (notification.recipientId !== user.id) {
      return errorResponse("FORBIDDEN", "只能处理自己的通知", 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: notification.isRead
        ? {}
        : {
            isRead: true,
            readAt: new Date()
          }
    });

    return successResponse(updated, "已标记为已读");
  } catch (error) {
    return handleApiError(error);
  }
}
