import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getLeaveExportRows } from "@/lib/export-data";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { leaveListQuerySchema } from "@/lib/validators";
import { maskPhone } from "@/utils/format";

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
    const query = leaveListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getLeaveExportRows(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "请假记录",
        columns: [
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "管家手机号", key: "butlerPhone", width: 16 },
          { header: "请假开始时间", key: "startAt", width: 18 },
          { header: "请假结束时间", key: "endAt", width: 18 },
          { header: "请假类型", key: "leaveType", width: 12 },
          { header: "请假原因", key: "reason", width: 24 },
          { header: "请假状态", key: "status", width: 12 },
          { header: "审核人", key: "reviewerName", width: 14 },
          { header: "审核时间", key: "reviewedAt", width: 18 },
          { header: "驳回原因", key: "reviewRemark", width: 24 },
          { header: "创建时间", key: "createdAt", width: 18 }
        ],
        rows: rows.map((item) => ({
          butlerName: item.butler.name,
          butlerPhone: maskPhone(item.butler.phone),
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          leaveType: item.leaveType,
          reason: item.reason,
          status: item.status,
          reviewerName: item.reviewer?.name ?? "-",
          reviewedAt: item.reviewedAt?.toISOString() ?? "",
          reviewRemark: item.reviewRemark ?? "",
          createdAt: item.createdAt.toISOString()
        }))
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_LEAVES",
      targetType: "FinanceExport",
      remark: "导出请假记录",
      afterData: query
    });

    return exportResponse(buffer, getExportFilename("请假记录"));
  } catch (error) {
    return handleApiError(error);
  }
}
