import { NextRequest } from "next/server";
import { getFinanceButlerServices } from "@/lib/finance";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
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
    const { items, total } = await getFinanceButlerServices(user, query);

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
