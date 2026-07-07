import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getFinanceOrdersForExport } from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { canAccess } from "@/lib/permissions";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError } from "@/lib/response";
import { financeOrdersQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "finance", "export") || user.roleCode === "butler") {
    return errorResponse("FORBIDDEN", "没有权限导出订单明细", 403);
  }

  try {
    const query = financeOrdersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getFinanceOrdersForExport(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "订单明细",
        columns: [
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "客人手机号", key: "guestPhone", width: 16 },
          { header: "入住人数", key: "guestCount", width: 10 },
          { header: "入住日期", key: "checkInDate", width: 18 },
          { header: "离店日期", key: "checkOutDate", width: 18 },
          { header: "接站类型", key: "pickupType", width: 12 },
          { header: "到达地点", key: "arrivalStation", width: 20 },
          { header: "到达时间", key: "arrivalTime", width: 18 },
          { header: "航班号/车次", key: "flightTrainNo", width: 18 },
          { header: "服务管家", key: "butlerNames", width: 28 },
          { header: "订单状态", key: "status", width: 14 },
          { header: "服务完成时间", key: "serviceCompletedAt", width: 18 },
          { header: "前台平均评分", key: "frontdeskAverageScore", width: 12 },
          { header: "调配员平均评分", key: "dispatcherAverageScore", width: 14 },
          { header: "结算状态", key: "settlementStatus", width: 12 },
          { header: "结算备注", key: "settlementRemark", width: 24 },
          { header: "创建时间", key: "createdAt", width: 18 }
        ],
        rows: rows.map((item) => ({
          ...item,
          butlerNames: item.butlerNames.join("、")
        }))
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_ORDERS",
      targetType: "FinanceExport",
      remark: "导出订单明细",
      afterData: query,
      ...getRequestMeta(request)
    });

    return exportResponse(buffer, getExportFilename("订单明细"));
  } catch (error) {
    return handleApiError(error);
  }
}
