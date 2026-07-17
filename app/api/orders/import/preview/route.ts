import { NextRequest } from "next/server";
import { canImportOrders } from "@/lib/permissions";
import {
  createImportFingerprint,
  normalizeHotelName,
  parseOrderImportWorkbook
} from "@/lib/order-import";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

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

    if (!(file instanceof File)) {
      return errorResponse("FILE_REQUIRED", "请选择导入文件", 422);
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse("FILE_SIZE_INVALID", "导入文件不能超过 5 MB", 422);
    }

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

    const rows = parsed.rows.map((row) => {
      const errors = [...row.errors];
      const warnings = [...row.warnings];
      const matchedHotel = row.sourceHotelName
        ? hotels.find(
            (hotel) =>
              normalizeHotelName(hotel.name) === normalizeHotelName(row.sourceHotelName)
          )
        : null;
      const hotel =
        user.roleCode === "hotel_frontdesk"
          ? boundHotel
          : selectedHotel ?? matchedHotel ?? null;

      if (!row.sourceHotelName && !selectedHotel) {
        errors.push("无法从表格标题识别酒店");
      } else if (!row.sourceHotelName && selectedHotel) {
        warnings.push(`无法从表格标题识别酒店，将按手动选择的“${selectedHotel.name}”导入`);
      } else if (
        user.roleCode === "hotel_frontdesk" &&
        boundHotel &&
        normalizeHotelName(boundHotel.name) !== normalizeHotelName(row.sourceHotelName)
      ) {
        errors.push(`表格酒店“${row.sourceHotelName}”与当前账号所属酒店不一致`);
      } else if (
        selectedHotel &&
        row.sourceHotelName &&
        normalizeHotelName(selectedHotel.name) !== normalizeHotelName(row.sourceHotelName)
      ) {
        warnings.push(`原表酒店为“${row.sourceHotelName}”，将按手动选择的酒店导入`);
      }

      if (!hotel) errors.push("未匹配到所属酒店，请手动选择");

      const fingerprint =
        hotel &&
        row.pickupType &&
        row.transportDirection &&
        row.serviceStartAt
          ? createImportFingerprint({
              hotelId: hotel.id,
              pickupType: row.pickupType,
              transportDirection: row.transportDirection,
              serviceStartAt: row.serviceStartAt,
              guestPhone: row.guestPhone,
              roomNo: row.roomNo
            })
          : null;

      return {
        ...row,
        hotelId: hotel?.id ?? null,
        hotelName: hotel?.name ?? null,
        fingerprint,
        errors,
        warnings,
        duplicate: false
      };
    });

    const duplicateFingerprints = new Set<string>();
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.fingerprint) continue;
      counts.set(row.fingerprint, (counts.get(row.fingerprint) ?? 0) + 1);
    }
    for (const [fingerprint, count] of counts) {
      if (count > 1) duplicateFingerprints.add(fingerprint);
    }

    const existing = await prisma.serviceOrder.findMany({
      where: {
        importFingerprint: {
          in: rows.flatMap((row) => (row.fingerprint ? [row.fingerprint] : []))
        }
      },
      select: { importFingerprint: true, orderNo: true }
    });
    const existingByFingerprint = new Map(
      existing.flatMap((item) =>
        item.importFingerprint ? [[item.importFingerprint, item.orderNo] as const] : []
      )
    );

    const finalizedRows = rows.map((row) => {
      if (!row.fingerprint) return row;
      const existingOrderNo = existingByFingerprint.get(row.fingerprint);
      const duplicate = duplicateFingerprints.has(row.fingerprint) || Boolean(existingOrderNo);
      return {
        ...row,
        duplicate,
        errors: duplicate
          ? [
              ...row.errors,
              existingOrderNo
                ? `疑似重复：系统已有订单 ${existingOrderNo}`
                : "疑似重复：文件内存在相同订单"
            ]
          : row.errors
      };
    });

    return successResponse({
      fileName: file.name,
      rows: finalizedRows,
      sheetErrors: parsed.sheetErrors
    });
  } catch (error) {
    return handleApiError(error);
  }
}
