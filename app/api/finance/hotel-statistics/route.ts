import { NextRequest } from "next/server";
import { getFinanceHotelStatistics } from "@/lib/finance";
import { canAccess } from "@/lib/permissions";
import { requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { financeHotelStatisticsQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "finance", "view")) {
    return errorResponse("FORBIDDEN", "没有权限查看酒店统计", 403);
  }

  if (user.roleCode === "butler") {
    return errorResponse("FORBIDDEN", "管家不能查看全局酒店统计", 403);
  }

  try {
    const query = financeHotelStatisticsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const { items, total } = await getFinanceHotelStatistics(user, query);

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
