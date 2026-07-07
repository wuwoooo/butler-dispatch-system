import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { reviewListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const query = reviewListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const [items, total] = await Promise.all([
      prisma.serviceReview.findMany({
        where: {
          butlerId: user.butlerId,
          complaintFlag: query.complaintFlag,
          createdAt:
            query.startTime || query.endTime
              ? {
                  gte: query.startTime ? new Date(query.startTime) : undefined,
                  lte: query.endTime ? new Date(query.endTime) : undefined
                }
              : undefined
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              hotel: {
                select: {
                  id: true,
                  name: true
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
      }),
      prisma.serviceReview.count({
        where: {
          butlerId: user.butlerId
        }
      })
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
