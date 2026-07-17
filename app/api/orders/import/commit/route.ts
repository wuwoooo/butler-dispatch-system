import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { canImportOrders } from "@/lib/permissions";
import {
  createImportFingerprint,
  normalizeHotelName,
  parseOrderImportWorkbook
} from "@/lib/order-import";
import { generateOrderNo } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import {
  orderImportCommitRowSchema,
  orderImportCommitSelectionSchema
} from "@/lib/validators";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) return response;
  if (!canImportOrders(user)) {
    return errorResponse("FORBIDDEN", "没有权限批量导入订单", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const selectedHotelId = String(formData.get("hotelId") ?? "").trim();
    const selectionsText = String(formData.get("rows") ?? "");

    if (!(file instanceof File)) {
      return errorResponse("FILE_REQUIRED", "提交导入时必须重新上传原文件", 422);
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse("FILE_SIZE_INVALID", "导入文件不能超过 5 MB", 422);
    }

    let selectionsJson: unknown;
    try {
      selectionsJson = JSON.parse(selectionsText);
    } catch {
      return errorResponse("IMPORT_ROWS_INVALID", "导入行数据格式不正确", 422);
    }
    const selectionBody = orderImportCommitSelectionSchema.parse({ rows: selectionsJson });

    let parsed;
    try {
      parsed = parseOrderImportWorkbook(await file.arrayBuffer(), file.name);
    } catch (error) {
      return errorResponse(
        "IMPORT_FILE_INVALID",
        error instanceof Error && error.message.includes("不能超过")
          ? error.message
          : "文件无法解析，请确认为有效的 .xls 或 .xlsx 订单表",
        422
      );
    }

    const hotels = await prisma.hotel.findMany({
      where: { status: "active" },
      select: { id: true, name: true }
    });
    const boundHotel = user.hotelId
      ? hotels.find((hotel) => hotel.id === user.hotelId)
      : null;
    const selectedHotel = selectedHotelId
      ? hotels.find((hotel) => hotel.id === selectedHotelId)
      : null;

    if (user.roleCode === "hotel_frontdesk" && !boundHotel) {
      return errorResponse("HOTEL_REQUIRED", "酒店前台账号未绑定可用酒店", 422);
    }
    if (user.roleCode === "admin" && selectedHotelId && !selectedHotel) {
      return errorResponse("HOTEL_NOT_FOUND", "选择的酒店不存在或已停用", 404);
    }

    const selectionKeys = selectionBody.rows.map(selectionKey);
    if (new Set(selectionKeys).size !== selectionKeys.length) {
      return errorResponse("DUPLICATE_IMPORT", "提交数据中存在重复来源行", 422);
    }
    const parsedByKey = new Map(
      parsed.rows.map((row) => [selectionKey(row), row] as const)
    );

    const canonicalRows = [];
    const validationErrors: string[] = [];
    for (const selection of selectionBody.rows) {
      const source = parsedByKey.get(selectionKey(selection));
      if (!source) {
        validationErrors.push(`${selection.sourceSheet} 第 ${selection.sourceRow} 行已不存在`);
        continue;
      }

      const matchedHotel = source.sourceHotelName
        ? hotels.find(
            (hotel) =>
              normalizeHotelName(hotel.name) === normalizeHotelName(source.sourceHotelName)
          )
        : null;
      const hotel =
        user.roleCode === "hotel_frontdesk"
          ? boundHotel
          : selectedHotel ?? matchedHotel ?? null;

      if (!hotel) {
        validationErrors.push(`${source.sourceSheet} 第 ${source.sourceRow} 行未匹配到酒店`);
        continue;
      }
      if (
        user.roleCode === "hotel_frontdesk" &&
        (!source.sourceHotelName ||
          normalizeHotelName(hotel.name) !== normalizeHotelName(source.sourceHotelName))
      ) {
        validationErrors.push(`${source.sourceSheet} 第 ${source.sourceRow} 行酒店与当前账号不一致`);
        continue;
      }
      const sourceErrors = source.errors.filter(
        (message) => {
          if (message.includes("收费金额")) {
            return selection.settlementAmount === null;
          }

          return (
            !message.includes("预订人手机") &&
            !message.includes("目的地") &&
            !message.includes("无法从表格标题识别")
          );
        }
      );
      if (sourceErrors.length > 0) {
        validationErrors.push(
          `${source.sourceSheet} 第 ${source.sourceRow} 行：${sourceErrors.join("、")}`
        );
        continue;
      }

      const validated = orderImportCommitRowSchema.safeParse({
        hotelId: hotel.id,
        sourceSheet: source.sourceSheet,
        sourceRow: source.sourceRow,
        guestName: source.guestName,
        guestPhone: selection.guestPhone,
        guestCount: source.guestCount,
        roomType: source.roomType,
        roomNo: source.roomNo,
        pickupType: selection.pickupType,
        transportDirection: selection.transportDirection,
        serviceStartAt: source.serviceStartAt,
        serviceEndAt: selection.serviceEndAt,
        arrivalStation: selection.arrivalStation,
        requestedVehicleInfo: source.requestedVehicleInfo,
        requestedVehicleType: source.requestedVehicleType,
        settlementAmount: selection.settlementAmount,
        remark: source.remark
      });
      if (!validated.success) {
        validationErrors.push(
          `${source.sourceSheet} 第 ${source.sourceRow} 行：${validated.error.issues.map((issue) => issue.message).join("、")}`
        );
        continue;
      }
      canonicalRows.push(validated.data);
    }

    if (validationErrors.length > 0) {
      return errorResponse(
        "IMPORT_REVALIDATION_FAILED",
        validationErrors.slice(0, 3).join("；"),
        422
      );
    }

    const normalizedRows = canonicalRows.map((row) => ({
      ...row,
      fingerprint: createImportFingerprint({
        hotelId: row.hotelId,
        pickupType: row.pickupType,
        transportDirection: row.transportDirection,
        serviceStartAt: row.serviceStartAt,
        guestPhone: row.guestPhone,
        roomNo: row.roomNo
      })
    }));
    const fingerprints = normalizedRows.map((row) => row.fingerprint);

    if (new Set(fingerprints).size !== fingerprints.length) {
      return errorResponse("DUPLICATE_IMPORT", "提交数据中存在重复订单", 422);
    }

    const existing = await prisma.serviceOrder.findFirst({
      where: { importFingerprint: { in: fingerprints } },
      select: { orderNo: true }
    });
    if (existing) {
      return errorResponse(
        "DUPLICATE_IMPORT",
        `系统已有疑似重复订单 ${existing.orderNo}，请重新预览`,
        422
      );
    }

    const meta = getRequestMeta(request);
    const created = await prisma.$transaction(async (tx) => {
      const items: Array<{ id: string; orderNo: string }> = [];

      for (const row of normalizedRows) {
        const serviceStartAt = new Date(row.serviceStartAt);
        const serviceEndAt = new Date(row.serviceEndAt);
        const order = await tx.serviceOrder.create({
          data: {
            orderNo: await generateOrderNo(tx),
            hotelId: row.hotelId,
            createdById: user.id,
            guestName: row.guestName,
            guestPhone: row.guestPhone,
            guestCount: row.guestCount,
            serviceMode: "transport",
            transportDirection: row.transportDirection,
            serviceStartAt,
            serviceEndAt,
            checkInDate: serviceStartAt,
            checkOutDate: serviceEndAt,
            pickupType: row.pickupType,
            arrivalTime: serviceStartAt,
            arrivalStation: row.arrivalStation,
            roomType: row.roomType ?? null,
            roomNo: row.roomNo ?? null,
            requestedVehicleInfo: row.requestedVehicleInfo ?? null,
            requestedVehicleType: row.requestedVehicleType ?? null,
            settlementAmount: row.settlementAmount
              ? new Prisma.Decimal(row.settlementAmount)
              : null,
            remark: row.remark ?? null,
            status: "pending_dispatch",
            importFingerprint: row.fingerprint,
            importSourceFile: file.name,
            importSourceSheet: row.sourceSheet,
            importSourceRow: row.sourceRow
          },
          select: {
            id: true,
            orderNo: true,
            hotelId: true,
            guestName: true,
            guestPhone: true,
            guestCount: true,
            serviceMode: true,
            transportDirection: true,
            serviceStartAt: true,
            serviceEndAt: true,
            pickupType: true,
            arrivalStation: true,
            requestedVehicleInfo: true,
            requestedVehicleType: true,
            settlementAmount: true,
            importSourceFile: true,
            importSourceSheet: true,
            importSourceRow: true
          }
        });

        await tx.operationLog.create({
          data: {
            operatorId: user.id,
            operationType: "IMPORT_ORDER",
            targetType: "ServiceOrder",
            targetId: order.id,
            afterData: JSON.parse(JSON.stringify(order)) as Prisma.InputJsonValue,
            remark: `批量导入：${file.name} / ${row.sourceSheet} 第 ${row.sourceRow} 行`,
            ip: meta.ip,
            userAgent: meta.userAgent
          }
        });
        items.push({ id: order.id, orderNo: order.orderNo });
      }

      return items;
    });

    return successResponse(
      { items: created, count: created.length },
      `成功导入 ${created.length} 条订单`,
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function selectionKey(row: { sourceSheet: string; sourceRow: number }) {
  return `${row.sourceSheet}::${row.sourceRow}`;
}
