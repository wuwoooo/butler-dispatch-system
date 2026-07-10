import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { notifyUsers } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import {
  refreshButlerReviewStats,
  refreshOrderReviewStatus
} from "@/lib/reviews";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { reviewCreateSchema, reviewListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  if (!["admin", "dispatcher", "finance", "hotel_frontdesk"].includes(user.roleCode)) {
    return errorResponse("FORBIDDEN", "没有权限查看评价", 403);
  }

  try {
    const query = reviewListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.ServiceReviewWhereInput = {
      orderId: query.orderId || undefined,
      butlerId: query.butlerId || undefined,
      reviewerRole: query.reviewerRole || undefined,
      complaintFlag: query.complaintFlag,
      overallScore:
        query.scoreMin || query.scoreMax
          ? {
              gte: query.scoreMin,
              lte: query.scoreMax
            }
          : undefined,
      createdAt:
        query.startTime || query.endTime
          ? {
              gte: query.startTime ? new Date(query.startTime) : undefined,
              lte: query.endTime ? new Date(query.endTime) : undefined
            }
          : undefined,
      order: {
        hotelId:
          user.roleCode === "hotel_frontdesk"
            ? user.hotelId ?? "__none__"
            : query.hotelId || undefined
      }
    };

    const [items, total] = await Promise.all([
      prisma.serviceReview.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              guestName: true,
              hotel: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          butler: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true
            }
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              name: true,
              roleCode: true
            }
          }
        }
      }),
      prisma.serviceReview.count({ where })
    ]);

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
    return errorResponse("FORBIDDEN", "没有权限提交评价", 403);
  }

  const meta = getRequestMeta(request);

  try {
    const body = reviewCreateSchema.parse(await request.json());
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: body.orderId },
        include: {
          assignments: {
            include: {
              butler: {
                include: {
                  user: {
                    select: {
                      id: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new ApiError("ORDER_NOT_FOUND", "订单不存在", 404);
      }

      if (!["pending_review", "reviewed", "completed"].includes(order.status)) {
        throw new ApiError("ORDER_STATUS_NOT_ALLOWED", "当前订单状态不能评价", 422);
      }

      if (
        user.roleCode === "hotel_frontdesk" &&
        order.hotelId !== (user.hotelId ?? "__none__")
      ) {
        throw new ApiError("FORBIDDEN", "只能评价所属酒店订单", 403);
      }

      const assignment = order.assignments.find(
        (item) =>
          item.butlerId === body.butlerId &&
          !["rejected", "reassigned", "abnormal"].includes(item.status)
      );

      if (!assignment) {
        throw new ApiError("ASSIGNMENT_NOT_FOUND", "该管家未参与此订单", 404);
      }

      const exists = await tx.serviceReview.findFirst({
        where: {
          assignmentId: assignment.id,
          reviewerRole: user.roleCode
        },
        select: {
          id: true
        }
      });

      if (exists) {
        throw new ApiError("REVIEW_ALREADY_EXISTS", "当前评价人角色已评价过该管家", 409);
      }

      const review = await tx.serviceReview.create({
        data: {
          orderId: order.id,
          assignmentId: assignment.id,
          butlerId: body.butlerId,
          reviewerId: user.id,
          reviewerRole: user.roleCode,
          score: body.overallScore,
          overallScore: body.overallScore,
          attitudeScore: body.attitudeScore,
          punctualityScore: body.punctualityScore,
          communicationScore: body.communicationScore,
          tags: toJson(body.tags),
          content: body.content ?? null,
          complaintFlag: body.complaintFlag
        },
        include: {
          order: {
            select: {
              id: true,
              orderNo: true
            }
          },
          butler: {
            include: {
              user: {
                select: {
                  id: true
                }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              roleCode: true
            }
          }
        }
      });

      await refreshButlerReviewStats(body.butlerId, tx);
      await refreshOrderReviewStatus(order.id, tx, {
        operatorId: user.id,
        remark: "提交评价后更新订单评价状态",
        ...meta
      });

      await notifyUsers(
        [review.butler.user?.id],
        {
          title: "新的服务评价",
          content: "你收到了一条新的服务评价。",
          type: "review_received",
          targetType: "ServiceReview",
          targetId: review.id,
          payload: {
            reviewId: review.id,
            orderId: order.id,
            assignmentId: assignment.id,
            butlerId: body.butlerId
          }
        },
        tx
      );

      await tx.operationLog.create({
        data: {
          operatorId: user.id,
          operationType:
            user.roleCode === "hotel_frontdesk"
              ? "FRONTDESK_CREATE_REVIEW"
              : "DISPATCHER_CREATE_REVIEW",
          targetType: "ServiceReview",
          targetId: review.id,
          afterData: toJson(review),
          remark: "提交服务评价",
          ip: meta.ip,
          userAgent: meta.userAgent
        }
      });

      return review;
    });

    return successResponse(created, "评价已提交", { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }

    return handleApiError(error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
