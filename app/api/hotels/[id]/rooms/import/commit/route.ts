import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  applyHotelRoomImport,
  HotelRoomImportConflictError,
  parseHotelRoomImportWorkbook
} from "@/lib/hotel-room-import";
import { canImportHotelRooms } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { hotelRoomImportFileSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiUser(request);

  if (!user) return response;
  if (!canImportHotelRooms(user)) {
    return errorResponse("FORBIDDEN", "没有权限批量导入酒店客房", 403);
  }

  try {
    const { id } = await context.params;
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!hotel) {
      return errorResponse("HOTEL_NOT_FOUND", "酒店不存在", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return errorResponse("FILE_REQUIRED", "提交导入时必须重新上传原文件", 422);
    }
    hotelRoomImportFileSchema.parse({ name: file.name, size: file.size });

    let parsed;
    try {
      parsed = parseHotelRoomImportWorkbook(await file.arrayBuffer(), file.name);
    } catch (error) {
      return errorResponse(
        "IMPORT_FILE_INVALID",
        error instanceof Error ? error.message : "文件无法解析，请确认为有效的房型表",
        422
      );
    }

    const meta = getRequestMeta(request);
    let summary: Awaited<ReturnType<typeof applyHotelRoomImport>> | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        summary = await prisma.$transaction(
          async (tx) => {
            const result = await applyHotelRoomImport(tx, id, parsed);
            await tx.operationLog.create({
              data: {
                operatorId: user.id,
                operationType: "IMPORT_HOTEL_ROOMS",
                targetType: "Hotel",
                targetId: id,
                afterData: JSON.parse(
                  JSON.stringify({ fileName: file.name, summary: result })
                ) as Prisma.InputJsonValue,
                remark: `为酒店 ${hotel.name} 批量导入房型和房号`,
                ip: meta.ip,
                userAgent: meta.userAgent
              }
            });
            return result;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 3
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!summary) {
      return errorResponse("IMPORT_CONCURRENT_CONFLICT", "导入发生并发冲突，请重试", 409);
    }

    return successResponse(summary, `成功导入 ${summary.parsedRoomCount} 个客房单元`, {
      status: 201
    });
  } catch (error) {
    if (error instanceof HotelRoomImportConflictError) {
      return errorResponse("IMPORT_REVALIDATION_FAILED", error.message, 409);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return errorResponse("IMPORT_CONCURRENT_CONFLICT", "有其他客房导入正在提交，请稍后重试", 409);
    }
    return handleApiError(error);
  }
}
