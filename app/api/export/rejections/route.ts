import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getRejectionExportRows } from "@/lib/export-data";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { rejectionListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher",
    "finance",
    "hotel_frontdesk"
  ]);

  if (!user) {
    return response;
  }

  try {
    const query = rejectionListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getRejectionExportRows(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "拒单记录",
        columns: [
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "拒单原因", key: "reason", width: 30 },
          { header: "拒单时间", key: "createdAt", width: 18 },
          { header: "处理人", key: "operatorName", width: 14 },
          { header: "处理结果", key: "result", width: 14 }
        ],
        rows: rows.map((item) => ({
          orderNo: item.order.orderNo,
          hotelName: item.order.hotel?.name ?? "-",
          butlerName: item.butler.name,
          reason: item.reason,
          createdAt: item.createdAt.toISOString(),
          operatorName: item.createdBy?.name ?? "-",
          result: "已拒单"
        }))
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_REJECTIONS",
      targetType: "FinanceExport",
      remark: "导出拒单记录",
      afterData: query
    });

    return exportResponse(buffer, getExportFilename("拒单记录"));
  } catch (error) {
    return handleApiError(error);
  }
}
