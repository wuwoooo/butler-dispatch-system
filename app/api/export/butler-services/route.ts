import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getFinanceButlerServicesForExport } from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { financeButlerServicesQuerySchema } from "@/lib/validators";

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
    const query = financeButlerServicesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getFinanceButlerServicesForExport(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "管家服务明细",
        columns: [
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "管家手机号", key: "butlerPhone", width: 16 },
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "入住人数", key: "guestCount", width: 10 },
          { header: "入住日期", key: "checkInDate", width: 18 },
          { header: "离店日期", key: "checkOutDate", width: 18 },
          { header: "接站类型", key: "pickupType", width: 12 },
          { header: "到达时间", key: "arrivalTime", width: 18 },
          { header: "分配状态", key: "assignmentStatus", width: 12 },
          { header: "是否拒单", key: "isRejected", width: 10 },
          { header: "是否完成", key: "isCompleted", width: 10 },
          { header: "综合评分", key: "overallScore", width: 10 },
          { header: "服务完成时间", key: "completedAt", width: 18 }
        ],
        rows
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_BUTLER_SERVICES",
      targetType: "FinanceExport",
      remark: "导出管家服务明细",
      afterData: query
    });

    return exportResponse(buffer, getExportFilename("管家服务明细"));
  } catch (error) {
    return handleApiError(error);
  }
}
