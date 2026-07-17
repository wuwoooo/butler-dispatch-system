import { NextRequest } from "next/server";
import { getButlerAvailabilityForOrder, getOrderDetail } from "@/lib/orders";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import {
  getDefaultTransportFeeText,
  getDefaultTransportFeesByVehicleType
} from "@/lib/transport-pricing";
import { resolveRecommendedVehicle } from "@/lib/vehicle-recommendation";

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
    const [items, order] = await Promise.all([
      getButlerAvailabilityForOrder(id),
      getOrderDetail(id)
    ]);

    if (!items || !order) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    const recommendation = resolveRecommendedVehicle({
      guestCount: order.guestCount,
      requestedVehicleType: order.requestedVehicleType
    });
    const pickupType = order.pickupType === "train" ? "train" : "airport";

    return successResponse({
      items,
      recommendation,
      defaultSettlementAmount: getDefaultTransportFeeText({
        pickupType,
        vehicleType: recommendation.vehicleType
      }),
      settlementAmountsByVehicleType:
        getDefaultTransportFeesByVehicleType(pickupType)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
