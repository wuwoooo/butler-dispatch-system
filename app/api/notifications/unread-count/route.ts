import { NextRequest } from "next/server";
import { getUnreadNotificationCount } from "@/lib/notifications-center";
import { requireApiUser } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  try {
    const count = await getUnreadNotificationCount(user);
    return successResponse({ count });
  } catch (error) {
    return handleApiError(error);
  }
}
