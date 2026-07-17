import { NextRequest } from "next/server";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
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
    const where = query.butlerId ? { id: query.butlerId } : undefined;

    const [items, total] = await Promise.all([
      getButlerStatisticsRows(query, {
        butlerId: query.butlerId,
        hotelId: query.hotelId,
        page: query.page,
        pageSize: query.pageSize
      }),
      prisma.butler.count({ where })
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "VIEW_BUTLER_STATISTICS_REPORT",
      targetType: "ButlerStatistics",
      remark: "查看后台管家统计"
    });

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
