import { NextRequest } from "next/server";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
import { getButlerStatisticsRows } from "@/lib/statistics";
import { statisticsQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher",
    "finance"
  ]);

  if (!user) {
    return response;
  }

  try {
    const query = statisticsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const items = await getButlerStatisticsRows(query, {
      butlerId: query.butlerId,
      hotelId: query.hotelId
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "VIEW_BUTLER_STATISTICS_REPORT",
      targetType: "ButlerStatistics",
      remark: "查看后台管家统计"
    });

    return successResponse({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
