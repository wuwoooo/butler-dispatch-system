import { NextRequest } from "next/server";
import { getNotificationList } from "@/lib/notifications-center";
import { requireApiUser } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
import { notificationListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  try {
    const query = notificationListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const { items, total } = await getNotificationList(user, query);

    return successResponse({
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
