import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { refreshLeaveStatuses } from "@/lib/leaves";
import { prisma } from "@/lib/prisma";
import { requireApiRoles } from "@/lib/request";
import { handleApiError, successResponse } from "@/lib/response";
import { leaveListQuerySchema } from "@/lib/validators";

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
    await refreshLeaveStatuses();
    const query = leaveListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.ButlerLeaveWhereInput = {
      status: query.status || undefined,
      leaveType: query.leaveType || undefined,
      butler: {
        name: query.butlerName ? { contains: query.butlerName } : undefined,
        phone: query.butlerPhone ? { contains: query.butlerPhone } : undefined
      },
      createdAt:
        query.createdStartTime || query.createdEndTime
          ? {
              gte: query.createdStartTime
                ? new Date(query.createdStartTime)
                : undefined,
              lte: query.createdEndTime ? new Date(query.createdEndTime) : undefined
            }
          : undefined
    };

    if (query.leaveStartTime || query.leaveEndTime) {
      where.AND = [
        query.leaveEndTime
          ? {
              startAt: {
                lte: new Date(query.leaveEndTime)
              }
            }
          : {},
        query.leaveStartTime
          ? {
              endAt: {
                gte: new Date(query.leaveStartTime)
              }
            }
          : {}
      ];
    }

    const [items, total] = await Promise.all([
      prisma.butlerLeave.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          butler: {
            select: {
              id: true,
              code: true,
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
      prisma.butlerLeave.count({ where })
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
