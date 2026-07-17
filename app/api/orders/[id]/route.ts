import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildOrderScopeWhere, getOrderDetail } from "@/lib/orders";
import {
  findOrderAssignmentTimeConflictsAfterOrderChange,
  formatOrderWindow,
  getOrderServiceWindow
} from "@/lib/order-conflicts";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { orderListSelect } from "@/lib/selects";
import { orderUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "orders", "view")) {
    return errorResponse("FORBIDDEN", "没有权限查看订单", 403);
  }

  try {
    const { id } = await context.params;
    const order = await getOrderDetail(id);

    if (!order) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    if (
      user.roleCode === "hotel_frontdesk" &&
      order.hotelId !== (user.hotelId ?? "__none__")
    ) {
      return errorResponse("FORBIDDEN", "只能查看所属酒店订单", 403);
    }

    if (
      user.roleCode === "butler" &&
      !order.assignments.some((assignment) => assignment.butlerId === user.butlerId)
    ) {
      return errorResponse("FORBIDDEN", "只能查看自己的订单", 403);
    }

    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "orders", "update")) {
    return errorResponse("FORBIDDEN", "没有权限修改订单", 403);
  }

  try {
    const { id } = await context.params;
    const body = orderUpdateSchema.parse(await request.json());
    const before = await prisma.serviceOrder.findFirst({
      where: {
        id,
        ...buildOrderScopeWhere(user)
      },
      select: orderListSelect
    });

    if (!before) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    const isFrontdesk = user.roleCode === "hotel_frontdesk";
    const canOnlyUpdateRemark =
      isFrontdesk && before.status !== "pending_dispatch";

    const data: Prisma.ServiceOrderUpdateInput = canOnlyUpdateRemark
      ? {
          remark: body.remark ?? before.remark
        }
      : {
          hotel: body.hotelId ? { connect: { id: body.hotelId } } : undefined,
          guestName: body.guestName,
          guestPhone: body.guestPhone,
          guestCount: body.guestCount,
          checkInDate: body.checkInDate ? new Date(body.checkInDate) : undefined,
          checkOutDate: Object.prototype.hasOwnProperty.call(body, "checkOutDate")
            ? new Date(body.checkOutDate as string)
            : undefined,
          roomType: Object.prototype.hasOwnProperty.call(body, "roomType")
            ? body.roomType ?? null
            : undefined,
          roomNo: Object.prototype.hasOwnProperty.call(body, "roomNo")
            ? body.roomNo ?? null
            : undefined,
          pickupType: body.pickupType,
          transportDirection:
            before.serviceMode === "transport" &&
            Object.prototype.hasOwnProperty.call(body, "transportDirection")
              ? body.transportDirection ?? null
              : undefined,
          arrivalStation: Object.prototype.hasOwnProperty.call(body, "arrivalStation")
            ? body.arrivalStation ?? ""
            : undefined,
          arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : undefined,
          flightTrainNo: Object.prototype.hasOwnProperty.call(body, "flightTrainNo")
            ? body.flightTrainNo ?? null
            : undefined,
          destination: Object.prototype.hasOwnProperty.call(body, "destination")
            ? body.destination ?? null
            : undefined,
          requestedVehicleType: Object.prototype.hasOwnProperty.call(body, "requestedVehicleType")
            ? body.requestedVehicleType ?? null
            : undefined,
          requestedVehicleInfo: Object.prototype.hasOwnProperty.call(body, "requestedVehicleInfo")
            ? body.requestedVehicleInfo ?? null
            : undefined,
          specialNeeds: Object.prototype.hasOwnProperty.call(body, "specialNeeds")
            ? body.specialNeeds ?? null
            : undefined,
          remark: Object.prototype.hasOwnProperty.call(body, "remark")
            ? body.remark ?? null
            : undefined,
          settlementAmount:
            before.serviceMode === "transport" &&
            Object.prototype.hasOwnProperty.call(body, "settlementAmount")
              ? body.settlementAmount === null
                ? null
                : new Prisma.Decimal(body.settlementAmount as string)
              : undefined,
          status:
            user.roleCode === "admin" || user.roleCode === "dispatcher"
              ? body.status
              : undefined
        };

    if (isFrontdesk && body.hotelId && body.hotelId !== before.hotel.id) {
      return errorResponse("FORBIDDEN", "酒店前台不能变更订单所属酒店", 403);
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "checkOutDate") &&
      !body.checkOutDate
    ) {
      return errorResponse("CHECK_OUT_REQUIRED", "离店日期不能为空", 422);
    }

    if (
      before.serviceMode === "transport" &&
      Object.prototype.hasOwnProperty.call(body, "transportDirection") &&
      !body.transportDirection
    ) {
      return errorResponse("TRANSPORT_DIRECTION_REQUIRED", "接送方向不能为空", 422);
    }

    if (
      before.serviceMode === "transport" &&
      Object.prototype.hasOwnProperty.call(body, "arrivalStation") &&
      !body.arrivalStation?.trim()
    ) {
      return errorResponse("ARRIVAL_STATION_REQUIRED", "接送地点不能为空", 422);
    }

    const timeFieldsChanged =
      Object.prototype.hasOwnProperty.call(body, "checkInDate") ||
      Object.prototype.hasOwnProperty.call(body, "checkOutDate") ||
      Object.prototype.hasOwnProperty.call(body, "arrivalTime") ||
      Object.prototype.hasOwnProperty.call(body, "serviceStartAt") ||
      Object.prototype.hasOwnProperty.call(body, "serviceEndAt");

    if (!canOnlyUpdateRemark && timeFieldsChanged) {
      const targetWindow =
        before.serviceMode === "transport"
          ? {
              startAt: body.serviceStartAt
                ? new Date(body.serviceStartAt)
                : before.serviceStartAt,
              endAt: body.serviceEndAt
                ? new Date(body.serviceEndAt)
                : before.serviceEndAt
            }
          : getOrderServiceWindow({
              arrivalTime: body.arrivalTime
                ? new Date(body.arrivalTime)
                : before.arrivalTime,
              checkInDate: body.checkInDate
                ? new Date(body.checkInDate)
                : before.checkInDate,
              checkOutDate: Object.prototype.hasOwnProperty.call(body, "checkOutDate")
                ? new Date(body.checkOutDate as string)
                : before.checkOutDate
            });

      if (targetWindow.endAt <= targetWindow.startAt) {
        return errorResponse(
          "ORDER_TIME_INVALID",
          before.serviceMode === "transport"
            ? "服务结束时间必须晚于开始时间"
            : "离店日期必须晚于到达时间和入住日期",
          422
        );
      }
      const conflicts = await findOrderAssignmentTimeConflictsAfterOrderChange(
        id,
        targetWindow
      );

      if (conflicts.length > 0) {
        const message = conflicts
          .slice(0, 5)
          .map(
            (conflict) =>
              `${conflict.butlerName} 已有订单 ${conflict.orderNo}（${formatOrderWindow(
                conflict.window
              )}）`
          )
          .join("；");

        return errorResponse(
          "ORDER_TIME_CONFLICT",
          `订单时间与已分配管家的其他订单冲突：${message}`,
          422
        );
      }

      data.serviceStartAt = targetWindow.startAt;
      data.serviceEndAt = targetWindow.endAt;

      if (before.serviceMode === "transport") {
        data.arrivalTime = targetWindow.startAt;
        data.checkInDate = targetWindow.startAt;
        data.checkOutDate = targetWindow.endAt;
      }
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data,
      select: orderListSelect
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_ORDER",
      targetType: "ServiceOrder",
      targetId: updated.id,
      beforeData: before,
      afterData: updated,
      remark: canOnlyUpdateRemark
        ? "已分配订单，酒店前台仅修改备注"
        : "修改订单",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!canAccess(user, "orders", "delete")) {
    return errorResponse("FORBIDDEN", "没有权限删除订单", 403);
  }

  try {
    const { id } = await context.params;
    const before = await prisma.serviceOrder.findFirst({
      where: {
        id,
        ...buildOrderScopeWhere(user)
      },
      select: {
        ...orderListSelect,
        _count: {
          select: {
            assignments: true,
            abnormalRecords: true
          }
        }
      }
    });

    if (!before) {
      return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
    }

    if (before.status !== "pending_dispatch") {
      return errorResponse(
        "ORDER_DELETE_STATUS_NOT_ALLOWED",
        "只能删除待分配订单",
        422
      );
    }

    if (before._count.assignments > 0) {
      return errorResponse(
        "ORDER_HAS_ASSIGNMENT_HISTORY",
        "该订单已产生过管家分配记录，不能删除",
        409
      );
    }

    if (before._count.abnormalRecords > 0) {
      return errorResponse(
        "ORDER_HAS_ABNORMAL_RECORDS",
        "该订单关联了异常记录，请先处理关联记录",
        409
      );
    }

    try {
      await prisma.serviceOrder.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return errorResponse(
          "ORDER_HAS_RELATED_RECORDS",
          "该订单已关联业务记录，不能删除",
          409
        );
      }
      throw error;
    }

    await writeOperationLog({
      operatorId: user.id,
      operationType: "DELETE_ORDER",
      targetType: "ServiceOrder",
      targetId: id,
      beforeData: before,
      remark: "删除待分配订单",
      ...getRequestMeta(request)
    });

    return successResponse({ id }, "删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
