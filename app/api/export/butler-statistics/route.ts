import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { getButlerStatisticsRows } from "@/lib/statistics";

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
    const params = request.nextUrl.searchParams;
    const startDate = params.get("startDate") ?? undefined;
    const endDate = params.get("endDate") ?? undefined;
    const range = startDate || endDate ? "custom" : "month";
    const rows = await getButlerStatisticsRows({
      range,
      startTime: startDate,
      endTime: endDate
    }, {
      butlerId: params.get("butlerId") ?? undefined,
      hotelId: params.get("hotelId") ?? undefined
    });

    const butlerStatusMap: Record<string, string> = {
      available: "空闲",
      pending_confirm: "待接单",
      confirmed_waiting: "已确认待接客",
      in_service: "接待中",
      on_leave: "请假中",
      suspended: "空闲",
      disabled: "空闲"
    };

    const buffer = await buildWorkbookBuffer([
      {
        name: "管家统计",
        columns: [
          { header: "管家姓名", key: "name", width: 14 },
          { header: "手机号", key: "phone", width: 16 },
          { header: "当前状态", key: "status", width: 12 },
          { header: "接单数", key: "orderCount", width: 10 },
          { header: "完成单数", key: "completedOrderCount", width: 12 },
          { header: "服务客人数", key: "guestCount", width: 12 },
          { header: "拒单次数", key: "rejectCount", width: 10 },
          { header: "拒单率", key: "rejectRate", width: 10 },
          { header: "平均评分", key: "averageScore", width: 10 },
          { header: "好评率", key: "goodReviewRate", width: 10 },
          { header: "请假天数", key: "leaveDays", width: 10 }
        ],
        rows: rows.map((item) => ({
          ...item,
          status: butlerStatusMap[item.status] || item.status
        }))
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_BUTLER_STATISTICS",
      targetType: "FinanceExport",
      remark: "导出管家统计",
      afterData: Object.fromEntries(params),
      ...getRequestMeta(request)
    });

    return exportResponse(buffer, getExportFilename("管家统计"));
  } catch (error) {
    return handleApiError(error);
  }
}
