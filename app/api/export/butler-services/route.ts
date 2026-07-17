import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getFinanceButlerServicesForExport } from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { financeButlerServicesQuerySchema } from "@/lib/validators";
import { formatDate, formatDateTime } from "@/utils/format";

const assignmentStatusMap: Record<string, string> = {
  pending_confirm: "待确认",
  confirmed: "已确认",
  rejected: "已拒单",
  picked_guest: "已接到客人",
  in_service: "服务中",
  completed: "已完成",
  abnormal: "异常",
  reassigned: "已改派",
  cancelled: "已取消"
};

const pickupTypeMap: Record<string, string> = {
  airport: "接飞机",
  train: "接火车"
};

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
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "入住人数", key: "guestCount", width: 10 },
          { header: "入住日期", key: "checkInDate", width: 18 },
          { header: "离店日期", key: "checkOutDate", width: 18 },
          { header: "接站类型", key: "pickupType", width: 12 },
          { header: "到达时间", key: "arrivalTime", width: 18 },
          { header: "分配状态", key: "assignmentStatus", width: 12 },
          { header: "确认时间", key: "confirmedAt", width: 20 },
          { header: "接客时间", key: "pickedGuestAt", width: 20 },
          { header: "服务开始时间", key: "serviceStartedAt", width: 20 },
          { header: "服务完成时间", key: "completedAt", width: 20 },
          { header: "服务时长", key: "serviceDuration", width: 14 },
          { header: "是否拒单", key: "isRejected", width: 10 },
          { header: "是否完成", key: "isCompleted", width: 10 },
          { header: "综合评分", key: "overallScore", width: 10 }
        ],
        rows: rows.map((item) => ({
          ...item,
          checkInDate: formatDate(item.checkInDate),
          checkOutDate: item.checkOutDate ? formatDate(item.checkOutDate) : "-",
          pickupType: pickupTypeMap[item.pickupType] || item.pickupType,
          arrivalTime: formatDateTime(item.arrivalTime),
          assignmentStatus: assignmentStatusMap[item.assignmentStatus] || item.assignmentStatus,
          confirmedAt: item.confirmedAt ? formatDateTime(item.confirmedAt) : "-",
          pickedGuestAt: item.pickedGuestAt ? formatDateTime(item.pickedGuestAt) : "-",
          serviceStartedAt: item.serviceStartedAt ? formatDateTime(item.serviceStartedAt) : "-",
          completedAt: item.completedAt ? formatDateTime(item.completedAt) : "-",
          serviceDuration: item.serviceDuration || "-",
          isRejected: item.isRejected ? "是" : "否",
          isCompleted: item.isCompleted ? "是" : "否"
        }))
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
