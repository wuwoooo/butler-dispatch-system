import { NextRequest } from "next/server";
import { getFinanceOrders } from "@/lib/finance";
import { canAccess } from "@/lib/permissions";
import { requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { financeOrdersQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "finance", "view")) {
    return errorResponse("FORBIDDEN", "没有权限查看财务订单明细", 403);
  }

  if (user.roleCode === "butler") {
    return errorResponse("FORBIDDEN", "管家不能查看全局财务数据", 403);
  }

  try {
    const query = financeOrdersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const { items, total } = await getFinanceOrders(user, query);

    return successResponse({
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
