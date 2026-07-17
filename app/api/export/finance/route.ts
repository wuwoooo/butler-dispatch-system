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
import { formatDateTime } from "@/utils/format";

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

    const settlementStatusMap: Record<string, string> = {
      unsettled: "未结算",
      settled: "已结算"
    };

    const buffer = await buildWorkbookBuffer([
      {
        name: "订单明细",
        columns: [
          { header: "结算状态", key: "settlementStatus", width: 12 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "客人手机号", key: "guestPhone", width: 16 },
          { header: "收费金额", key: "settlementAmount", width: 14 },
          { header: "服务管家", key: "butlerNames", width: 28 },
          { header: "订单状态", key: "status", width: 14 },
          { header: "服务开始时间", key: "serviceStartedAt", width: 20 },
          { header: "服务完成时间", key: "serviceCompletedAt", width: 20 },
          { header: "服务时长", key: "serviceDuration", width: 14 }
        ],
        rows: orders.map((item) => ({
          ...item,
          status: orderStatusMap[item.status] || item.status,
          settlementStatus: settlementStatusMap[item.settlementStatus] || item.settlementStatus,
          settlementAmount:
            item.settlementAmount === null || item.settlementAmount === undefined
              ? "-"
              : Number(item.settlementAmount),
          serviceStartedAt: item.serviceStartedAt ? formatDateTime(item.serviceStartedAt) : "-",
          serviceCompletedAt: item.serviceCompletedAt ? formatDateTime(item.serviceCompletedAt) : "-",
          serviceDuration: item.serviceDuration || "-",
          butlerNames: item.butlerNames.join("、")
        }))
      },
      {
        name: "管家服务明细",
        columns: [
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "客人姓名", key: "guestName", width: 14 },
          { header: "分配状态", key: "assignmentStatus", width: 12 },
          { header: "综合评分", key: "overallScore", width: 10 },
          { header: "确认时间", key: "confirmedAt", width: 20 },
          { header: "接客时间", key: "pickedGuestAt", width: 20 },
          { header: "服务开始时间", key: "serviceStartedAt", width: 20 },
          { header: "服务完成时间", key: "completedAt", width: 20 },
          { header: "服务时长", key: "serviceDuration", width: 14 }
        ],
        rows: butlerServices.map((item) => ({
          ...item,
          assignmentStatus: assignmentStatusMap[item.assignmentStatus] || item.assignmentStatus,
          confirmedAt: item.confirmedAt ? formatDateTime(item.confirmedAt) : "-",
          pickedGuestAt: item.pickedGuestAt ? formatDateTime(item.pickedGuestAt) : "-",
          serviceStartedAt: item.serviceStartedAt ? formatDateTime(item.serviceStartedAt) : "-",
          completedAt: item.completedAt ? formatDateTime(item.completedAt) : "-",
          serviceDuration: item.serviceDuration || "-"
        }))
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
