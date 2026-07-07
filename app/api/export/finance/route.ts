import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import {
  getFinanceButlerServicesForExport,
  getFinanceHotelStatisticsForExport,
  getFinanceOrdersForExport
} from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { canAccess } from "@/lib/permissions";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError } from "@/lib/response";
import {
  financeButlerServicesQuerySchema,
  financeHotelStatisticsQuerySchema,
  financeOrdersQuerySchema
} from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "finance", "export") || user.roleCode === "butler") {
    return errorResponse("FORBIDDEN", "没有权限导出财务总表", 403);
  }

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const [orders, butlerServices, hotels] = await Promise.all([
      getFinanceOrdersForExport(user, financeOrdersQuerySchema.parse(params)),
      getFinanceButlerServicesForExport(user, financeButlerServicesQuerySchema.parse(params)),
      getFinanceHotelStatisticsForExport(user, financeHotelStatisticsQuerySchema.parse(params))
    ]);

    const buffer = await buildWorkbookBuffer([
      {
        name: "订单明细",
        columns: [
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "客人手机号", key: "guestPhone", width: 16 },
          { header: "服务管家", key: "butlerNames", width: 28 },
          { header: "订单状态", key: "status", width: 14 },
          { header: "结算状态", key: "settlementStatus", width: 12 }
        ],
        rows: orders.map((item) => ({
          ...item,
          butlerNames: item.butlerNames.join("、")
        }))
      },
      {
        name: "管家服务明细",
        columns: [
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "分配状态", key: "assignmentStatus", width: 12 },
          { header: "综合评分", key: "overallScore", width: 10 }
        ],
        rows: butlerServices
      },
      {
        name: "酒店统计",
        columns: [
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "订单总数", key: "orderCount", width: 12 },
          { header: "已完成订单数", key: "completedOrderCount", width: 14 },
          { header: "入住人数合计", key: "guestCount", width: 14 },
          { header: "平均评分", key: "averageScore", width: 12 }
        ],
        rows: hotels
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_FINANCE_REPORT",
      targetType: "FinanceExport",
      remark: "导出财务总表",
      afterData: params,
      ...getRequestMeta(request)
    });

    return exportResponse(buffer, getExportFilename("财务总表"));
  } catch (error) {
    return handleApiError(error);
  }
}
