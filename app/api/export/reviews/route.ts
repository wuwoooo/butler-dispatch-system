import { NextRequest } from "next/server";
import { buildWorkbookBuffer, exportResponse, getExportFilename } from "@/lib/export";
import { getReviewExportRows } from "@/lib/export-data";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { handleApiError } from "@/lib/response";
import { reviewListQuerySchema } from "@/lib/validators";

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
    const query = reviewListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const rows = await getReviewExportRows(user, query);
    const buffer = await buildWorkbookBuffer([
      {
        name: "评价统计",
        columns: [
          { header: "订单编号", key: "orderNo", width: 20 },
          { header: "酒店名称", key: "hotelName", width: 20 },
          { header: "管家姓名", key: "butlerName", width: 14 },
          { header: "评价人", key: "reviewerName", width: 14 },
          { header: "评价人角色", key: "reviewerRole", width: 14 },
          { header: "综合评分", key: "overallScore", width: 10 },
          { header: "服务态度评分", key: "attitudeScore", width: 12 },
          { header: "准时评分", key: "punctualityScore", width: 10 },
          { header: "沟通评分", key: "communicationScore", width: 10 },
          { header: "评价标签", key: "tags", width: 24 },
          { header: "评价内容", key: "content", width: 30 },
          { header: "是否投诉", key: "complaintFlag", width: 10 },
          { header: "评价时间", key: "createdAt", width: 18 }
        ],
        rows: rows.map((item) => ({
          orderNo: item.order.orderNo,
          hotelName: item.order.hotel?.name ?? "-",
          butlerName: item.butler.name,
          reviewerName: item.reviewer.name,
          reviewerRole: item.reviewerRole,
          overallScore: item.overallScore,
          attitudeScore: item.attitudeScore,
          punctualityScore: item.punctualityScore,
          communicationScore: item.communicationScore,
          tags: Array.isArray(item.tags) ? item.tags.join("、") : "",
          content: item.content ?? "",
          complaintFlag: item.complaintFlag ? "是" : "否",
          createdAt: item.createdAt.toISOString()
        }))
      }
    ]);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "EXPORT_REVIEWS",
      targetType: "FinanceExport",
      remark: "导出评价统计",
      afterData: query
    });

    return exportResponse(buffer, getExportFilename("评价统计"));
  } catch (error) {
    return handleApiError(error);
  }
}
