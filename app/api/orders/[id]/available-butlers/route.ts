import { NextRequest } from "next/server";
import { getButlerAvailabilityForOrder } from "@/lib/orders";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher"
  ]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const items = await getButlerAvailabilityForOrder(id);

    if (!items) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    return successResponse({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
