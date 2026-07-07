import { NextRequest } from "next/server";
import { getOperationLogs } from "@/lib/logs";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
import { logsQuerySchema } from "@/lib/validators";

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
    const query = logsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const { items, total } = await getOperationLogs(user, query);

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
