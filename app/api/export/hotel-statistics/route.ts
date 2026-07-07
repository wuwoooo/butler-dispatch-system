import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getFinanceHotelStatisticsForExport } from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { canAccess } from "@/lib/permissions";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError } from "@/lib/response";
import { financeHotelStatisticsQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "finance", "export") || user.roleCode === "butler") {
    return errorResponse("FORBIDDEN", "没有权限导出酒店统计", 403);
  }

  try {
    const query = financeHotelStatisticsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getFinanceHotelStatisticsForExport(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "酒店统计",
        columns: [
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "订单总数", key: "orderCount", width: 12 },
          { header: "已完成订单数", key: "completedOrderCount", width: 14 },
          { header: "服务中订单数", key: "inServiceOrderCount", width: 14 },
          { header: "待分配订单数", key: "pendingDispatchOrderCount", width: 14 },
          { header: "待评价订单数", key: "pendingReviewOrderCount", width: 14 },
          { header: "已取消订单数", key: "cancelledOrderCount", width: 14 },
          { header: "入住人数合计", key: "guestCount", width: 14 },
          { header: "接飞机订单数", key: "airportOrderCount", width: 14 },
          { header: "接火车订单数", key: "trainOrderCount", width: 14 },
          { header: "平均评分", key: "averageScore", width: 12 }
        ],
        rows
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_HOTEL_STATISTICS",
      targetType: "FinanceExport",
      remark: "导出酒店统计",
      afterData: query,
      ...getRequestMeta(request)
    });

    return exportResponse(buffer, getExportFilename("酒店统计"));
  } catch (error) {
    return handleApiError(error);
  }
}
