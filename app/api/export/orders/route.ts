import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getFinanceOrdersForExport } from "@/lib/finance";
import { writeOperationLog } from "@/lib/logger";
import { canAccess } from "@/lib/permissions";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError } from "@/lib/response";
import { financeOrdersQuerySchema } from "@/lib/validators";
import { formatDate, formatDateTime } from "@/utils/format";

const orderStatusMap: Record<string, string> = {
  pending_dispatch: "待分配",
  pending_confirm: "待确认",
  partial_rejected: "部分拒单",
  confirmed: "已确认",
  in_service: "服务中",
  partial_completed: "部分完成",
  pending_review: "待评价",
  reviewed: "已评价",
  completed: "已完成",
  cancelled: "已取消",
  abnormal: "异常"
};

const pickupTypeMap: Record<string, string> = {
  airport: "接飞机",
  train: "接火车"
};

const settlementStatusMap: Record<string, string> = {
  unsettled: "未结算",
  settled: "已结算"
};

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
          { header: "结算状态", key: "settlementStatus", width: 12 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "客人手机号", key: "guestPhone", width: 16 },
          { header: "接送/入住人数", key: "guestCount", width: 12 },
          { header: "收费金额", key: "settlementAmount", width: 14 },
          { header: "订单模式", key: "serviceMode", width: 12 },
          { header: "接送方向", key: "transportDirection", width: 12 },
          { header: "服务开始", key: "serviceStartAt", width: 20 },
          { header: "服务结束", key: "serviceEndAt", width: 20 },
          { header: "入住日期", key: "checkInDate", width: 18 },
          { header: "离店日期", key: "checkOutDate", width: 18 },
          { header: "接站类型", key: "pickupType", width: 12 },
          { header: "到达地点", key: "arrivalStation", width: 20 },
          { header: "到达时间", key: "arrivalTime", width: 18 },
          { header: "航班号/车次", key: "flightTrainNo", width: 18 },
          { header: "服务管家", key: "butlerNames", width: 28 },
          { header: "订单状态", key: "status", width: 14 },
          { header: "服务开始时间", key: "serviceStartedAt", width: 20 },
          { header: "服务完成时间", key: "serviceCompletedAt", width: 20 },
          { header: "服务时长", key: "serviceDuration", width: 14 },
          { header: "前台平均评分", key: "frontdeskAverageScore", width: 12 },
          { header: "调配员平均评分", key: "dispatcherAverageScore", width: 14 },
          { header: "结算备注", key: "settlementRemark", width: 24 },
          { header: "创建时间", key: "createdAt", width: 18 }
        ],
        rows: rows.map((item) => ({
          ...item,
          checkInDate: formatDate(item.checkInDate),
          checkOutDate: item.checkOutDate ? formatDate(item.checkOutDate) : "-",
          pickupType: pickupTypeMap[item.pickupType] || item.pickupType,
          arrivalTime: formatDateTime(item.arrivalTime),
          status: orderStatusMap[item.status] || item.status,
          serviceStartedAt: item.serviceStartedAt ? formatDateTime(item.serviceStartedAt) : "-",
          serviceCompletedAt: item.serviceCompletedAt ? formatDateTime(item.serviceCompletedAt) : "-",
          serviceDuration: item.serviceDuration || "-",
          settlementStatus: settlementStatusMap[item.settlementStatus] || item.settlementStatus,
          settlementAmount:
            item.settlementAmount === null || item.settlementAmount === undefined
              ? "-"
              : Number(item.settlementAmount),
          serviceMode: item.serviceMode === "transport" ? "交通接送" : "住店服务",
          transportDirection:
            item.serviceMode === "transport"
              ? item.transportDirection === "dropoff" ? "送" : "接"
              : "-",
          serviceStartAt: item.serviceStartAt ? formatDateTime(item.serviceStartAt) : "-",
          serviceEndAt: item.serviceEndAt ? formatDateTime(item.serviceEndAt) : "-",
          createdAt: formatDateTime(item.createdAt),
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
