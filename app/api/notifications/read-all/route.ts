import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return successResponse(result, "全部通知已标记为已读");
  } catch (error) {
    return handleApiError(error);
  }
}
