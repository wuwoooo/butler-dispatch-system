import { NextRequest } from "next/server";
import { getDashboardStatistics } from "@/lib/dashboard";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
import { dashboardQuerySchema } from "@/lib/validators";

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
    const query = dashboardQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const data = await getDashboardStatistics(user, query);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
