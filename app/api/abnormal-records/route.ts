import { NextRequest } from "next/server";
import { getAbnormalRecords } from "@/lib/abnormal-records";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { abnormalCreateSchema, abnormalListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!["admin", "dispatcher", "finance", "hotel_frontdesk", "butler"].includes(user.roleCode)) {
    return errorResponse("FORBIDDEN", "没有权限查看异常记录", 403);
  }

  try {
    const query = abnormalListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const { items, total } = await getAbnormalRecords(user, query);

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

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!["admin", "dispatcher", "hotel_frontdesk"].includes(user.roleCode)) {
    return errorResponse("FORBIDDEN", "没有权限新增异常记录", 403);
  }

  try {
    const body = abnormalCreateSchema.parse(await request.json());

    if (!body.orderId && !body.butlerId) {
      return errorResponse("ABNORMAL_TARGET_REQUIRED", "订单或管家至少需要一个", 422);
    }

    if (body.orderId) {
      const order = await prisma.serviceOrder.findUnique({
        where: { id: body.orderId },
        select: {
          id: true,
          hotelId: true
        }
      });

      if (!order) {
        return errorResponse("ORDER_NOT_FOUND", "订单不存在", 404);
      }

      if (user.roleCode === "hotel_frontdesk" && order.hotelId !== user.hotelId) {
        return errorResponse("FORBIDDEN", "只能提交自己酒店的异常记录", 403);
      }
    }

    const created = await prisma.abnormalRecord.create({
      data: {
        orderId: body.orderId ?? null,
        butlerId: body.butlerId ?? null,
        abnormalType: body.abnormalType,
        description: body.description,
        createdById: user.id
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            roomType: true,
            roomNo: true
          }
        },
        butler: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_ABNORMAL_RECORD",
      targetType: "AbnormalRecord",
      targetId: created.id,
      afterData: created,
      remark: "新增异常记录",
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
