import { Prisma } from "@prisma/client";
import { read, utils } from "xlsx";

const REQUIRED_HEADERS = [
  "房型代码",
  "PMS房型名称",
  "CRS房型名称",
  "各房型数量",
  "说明"
] as const;

const MAX_IMPORT_ROOMS = 500;

export type HotelRoomImportAction = "create" | "update" | "unchanged" | "conflict";

export type ParsedHotelRoom = {
  roomNo: string;
  remark: string | null;
};

export type ParsedHotelRoomType = {
  sourceSheet: string;
  sourceRow: number;
  code: string;
  name: string;
  crsName: string | null;
  declaredRoomCount: number;
  remark: string | null;
  rooms: ParsedHotelRoom[];
  warnings: string[];
  errors: string[];
};

export type ParsedHotelRoomImportWorkbook = {
  roomTypes: ParsedHotelRoomType[];
  sheetErrors: string[];
};

type ExistingRoomType = {
  id: string;
  code: string | null;
  name: string;
  sort: number;
  enabled: boolean;
  remark: string | null;
};

type ExistingRoom = {
  id: string;
  roomNo: string;
  roomTypeId: string;
  enabled: boolean;
  remark: string | null;
};

export type HotelRoomImportPlan = {
  roomTypes: Array<ParsedHotelRoomType & {
    key: string;
    action: HotelRoomImportAction;
    existingId: string | null;
    conflict: string | null;
  }>;
  rooms: Array<ParsedHotelRoom & {
    roomTypeKey: string;
    roomTypeCode: string;
    roomTypeName: string;
    action: HotelRoomImportAction;
    existingId: string | null;
    conflict: string | null;
  }>;
  errors: string[];
  warnings: string[];
  summary: {
    declaredRoomCount: number;
    parsedRoomCount: number;
    roomTypes: Record<HotelRoomImportAction, number>;
    rooms: Record<HotelRoomImportAction, number>;
  };
};

export class HotelRoomImportConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HotelRoomImportConflictError";
  }
}

export function parseHotelRoomImportWorkbook(
  data: ArrayBuffer,
  fileName: string
): ParsedHotelRoomImportWorkbook {
  const extension = fileName.toLowerCase().match(/\.(xlsx|xls)$/)?.[1];

  if (!extension) {
    throw new Error("仅支持 .xls 或 .xlsx 文件");
  }

  const workbook = read(data, {
    type: "array",
    cellDates: false,
    cellFormula: false,
    dense: true
  });
  const roomTypes: ParsedHotelRoomType[] = [];
  const sheetErrors: string[] = [];
  let detectedHeader = false;

  for (const sheetName of workbook.SheetNames) {
    if (workbook.Workbook?.Sheets?.find((item) => item.name === sheetName)?.Hidden) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const matrix = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false
    });
    const headerRowIndex = matrix.findIndex(isImportHeader);

    if (headerRowIndex < 0) {
      continue;
    }

    detectedHeader = true;
    const headerMap = buildHeaderMap(matrix[headerRowIndex]);
    for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const parsed = parseRoomTypeRow(
        matrix[rowIndex],
        headerMap,
        sheetName.trim() || sheetName,
        rowIndex + 1
      );
      if (parsed) roomTypes.push(parsed);
    }
  }

  if (!detectedHeader) {
    sheetErrors.push(`未找到包含“${REQUIRED_HEADERS.join("、")}”的标准表头`);
  } else if (roomTypes.length === 0) {
    sheetErrors.push("未找到可导入的房型数据行");
  }

  const roomOwners = new Map<string, ParsedHotelRoomType[]>();
  for (const roomType of roomTypes) {
    for (const room of roomType.rooms) {
      const owners = roomOwners.get(room.roomNo) ?? [];
      owners.push(roomType);
      roomOwners.set(room.roomNo, owners);
    }
  }
  for (const [roomNo, owners] of roomOwners) {
    if (owners.length <= 1) continue;
    for (const owner of owners) {
      owner.errors.push(`房号“${roomNo}”在文件中重复`);
    }
  }

  markDuplicateRoomTypes(roomTypes, "code", "房型代码");
  markDuplicateRoomTypes(roomTypes, "name", "PMS房型名称");

  const roomCount = roomTypes.reduce((sum, item) => sum + item.rooms.length, 0);
  if (roomCount > MAX_IMPORT_ROOMS) {
    throw new Error(`单次导入不能超过 ${MAX_IMPORT_ROOMS} 个房间`);
  }

  return { roomTypes, sheetErrors };
}

export function buildHotelRoomImportPlan(
  parsed: ParsedHotelRoomImportWorkbook,
  existingRoomTypes: ExistingRoomType[],
  existingRooms: ExistingRoom[]
): HotelRoomImportPlan {
  const errors = [
    ...parsed.sheetErrors,
    ...parsed.roomTypes.flatMap((item) =>
      item.errors.map((error) => `${item.sourceSheet} 第 ${item.sourceRow} 行：${error}`)
    )
  ];
  const warnings = parsed.roomTypes.flatMap((item) =>
    item.warnings.map((warning) => `${item.code || item.name}：${warning}`)
  );
  const roomTypes = parsed.roomTypes.map((source, index) => {
    const key = roomTypeKey(source);
    const codeMatches = existingRoomTypes.filter((item) => item.code === source.code);
    const nameMatches = existingRoomTypes.filter((item) => item.name === source.name);
    const existing = codeMatches[0] ?? nameMatches[0] ?? null;
    let conflict: string | null = null;

    if (codeMatches.length > 1) {
      conflict = `系统内房型代码“${source.code}”存在重复数据`;
    } else if (
      codeMatches[0] &&
      nameMatches[0] &&
      codeMatches[0].id !== nameMatches[0].id
    ) {
      conflict = `房型代码“${source.code}”和名称“${source.name}”分别匹配了不同房型`;
    } else if (
      !codeMatches[0] &&
      nameMatches[0]?.code &&
      nameMatches[0].code !== source.code
    ) {
      conflict = `房型名称“${source.name}”已使用代码“${nameMatches[0].code}”`;
    }

    if (conflict) errors.push(`${source.sourceSheet} 第 ${source.sourceRow} 行：${conflict}`);

    const importedRemark = buildRoomTypeRemark(source);
    const action: HotelRoomImportAction = conflict
      ? "conflict"
      : !existing
        ? "create"
        : existing.code === source.code &&
            existing.name === source.name &&
            existing.sort === index + 1 &&
            normalizeNullable(existing.remark) === normalizeNullable(importedRemark)
          ? "unchanged"
          : "update";

    return {
      ...source,
      key,
      action,
      existingId: existing?.id ?? null,
      conflict
    };
  });

  const plannedTypeByKey = new Map(roomTypes.map((item) => [item.key, item] as const));
  const existingRoomByNo = new Map(existingRooms.map((item) => [item.roomNo, item] as const));
  const rooms = roomTypes.flatMap((roomType) =>
    roomType.rooms.map((source) => {
      const existing = existingRoomByNo.get(source.roomNo) ?? null;
      const targetType = plannedTypeByKey.get(roomType.key)!;
      const conflict = targetType.conflict;
      const targetTypeMatches =
        targetType.existingId !== null && existing?.roomTypeId === targetType.existingId;
      const action: HotelRoomImportAction = conflict
        ? "conflict"
        : !existing
          ? "create"
        : targetTypeMatches &&
              (source.remark === null ||
                normalizeNullable(existing.remark) === normalizeNullable(source.remark))
            ? "unchanged"
            : "update";

      return {
        ...source,
        roomTypeKey: roomType.key,
        roomTypeCode: roomType.code,
        roomTypeName: roomType.name,
        action,
        existingId: existing?.id ?? null,
        conflict
      };
    })
  );

  return {
    roomTypes,
    rooms,
    errors,
    warnings,
    summary: {
      declaredRoomCount: parsed.roomTypes.reduce(
        (sum, item) => sum + item.declaredRoomCount,
        0
      ),
      parsedRoomCount: rooms.length,
      roomTypes: countActions(roomTypes),
      rooms: countActions(rooms)
    }
  };
}

export async function loadHotelRoomImportPlan(
  client: Prisma.TransactionClient,
  hotelId: string,
  parsed: ParsedHotelRoomImportWorkbook
) {
  const [roomTypes, rooms] = await Promise.all([
    client.hotelRoomType.findMany({
      where: { hotelId },
      select: {
        id: true,
        code: true,
        name: true,
        sort: true,
        enabled: true,
        remark: true
      }
    }),
    client.hotelRoom.findMany({
      where: { hotelId },
      select: {
        id: true,
        roomNo: true,
        roomTypeId: true,
        enabled: true,
        remark: true
      }
    })
  ]);
  return buildHotelRoomImportPlan(parsed, roomTypes, rooms);
}

export async function applyHotelRoomImport(
  client: Prisma.TransactionClient,
  hotelId: string,
  parsed: ParsedHotelRoomImportWorkbook
) {
  const plan = await loadHotelRoomImportPlan(client, hotelId, parsed);
  if (plan.errors.length > 0) {
    throw new HotelRoomImportConflictError(plan.errors.slice(0, 3).join("；"));
  }

  const roomTypeIds = new Map<string, string>();
  for (let index = 0; index < plan.roomTypes.length; index += 1) {
    const roomType = plan.roomTypes[index];
    const remark = buildRoomTypeRemark(roomType);
    if (roomType.action === "create") {
      const created = await client.hotelRoomType.create({
        data: {
          hotelId,
          code: roomType.code,
          name: roomType.name,
          sort: index + 1,
          enabled: true,
          remark
        },
        select: { id: true }
      });
      roomTypeIds.set(roomType.key, created.id);
    } else {
      const id = roomType.existingId!;
      if (roomType.action === "update") {
        await client.hotelRoomType.update({
          where: { id },
          data: {
            code: roomType.code,
            name: roomType.name,
            sort: index + 1,
            remark
          }
        });
      }
      roomTypeIds.set(roomType.key, id);
    }
  }

  for (const room of plan.rooms) {
    const roomTypeId = roomTypeIds.get(room.roomTypeKey)!;
    if (room.action === "create") {
      await client.hotelRoom.create({
        data: {
          hotelId,
          roomTypeId,
          roomNo: room.roomNo,
          enabled: true,
          remark: room.remark
        }
      });
    } else if (room.action === "update") {
      await client.hotelRoom.update({
        where: { id: room.existingId! },
        data: {
          roomTypeId,
          remark: room.remark ?? undefined
        }
      });
    }
  }

  return plan.summary;
}

function parseRoomTypeRow(
  row: unknown[],
  headerMap: Map<string, number>,
  sourceSheet: string,
  sourceRow: number
): ParsedHotelRoomType | null {
  const get = (header: string) => row[headerMap.get(header) ?? -1];
  const code = toText(get("房型代码"));
  const name = toText(get("PMS房型名称"));
  const crsText = toText(get("CRS房型名称"));
  const description = toText(get("说明"));
  const rawCount = get("各房型数量");

  if (![code, name, crsText, description, toText(rawCount)].some(Boolean)) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const declaredRoomCount = toPositiveInteger(rawCount);
  if (!code) errors.push("房型代码不能为空");
  if (!name) errors.push("PMS房型名称不能为空");
  if (name.length > 64) errors.push("PMS房型名称不能超过 64 个字符");
  if (code.length > 64) errors.push("房型代码不能超过 64 个字符");
  if (!declaredRoomCount) errors.push("各房型数量必须为大于 0 的整数");

  const groups = parseRoomGroups(description);
  let rooms: ParsedHotelRoom[] = [];
  const detailedRoomCount = groups.reduce((sum, group) => sum + group.internalRooms.length, 0);

  if (groups.length === 0) {
    errors.push("说明中未识别到“房间分布：楼栋（房号）”");
  } else if (declaredRoomCount && detailedRoomCount === declaredRoomCount) {
    rooms = groups.flatMap((group) =>
      group.internalRooms.map((internalRoom) => ({
        roomNo: joinRoomNo(group.building, internalRoom),
        remark: null
      }))
    );
  } else if (declaredRoomCount && groups.length === declaredRoomCount) {
    rooms = groups.map((group) => ({
      roomNo: group.building,
      remark: `内部房号：${group.internalRooms.join("、")}`
    }));
    warnings.push(
      `声明 ${declaredRoomCount} 个可售单元，但列出 ${detailedRoomCount} 个内部房号，已按 ${groups.length} 个楼栋单元导入`
    );
  } else if (declaredRoomCount) {
    errors.push(
      `声明数量为 ${declaredRoomCount}，但识别到 ${groups.length} 个楼栋、${detailedRoomCount} 个房号，无法确定可售单元`
    );
  }

  for (const room of rooms) {
    if (room.roomNo.length > 64) errors.push(`房号“${room.roomNo}”不能超过 64 个字符`);
    if ((room.remark?.length ?? 0) > 500) errors.push(`房号“${room.roomNo}”备注不能超过 500 个字符`);
  }

  const crsName = crsText && crsText !== "-" ? crsText : null;
  const remarkLength = [crsName ? `CRS房型名称：${crsName}` : "", description]
    .filter(Boolean)
    .join("\n").length;
  if (remarkLength > 255) errors.push("CRS房型名称与说明合计不能超过 255 个字符");

  return {
    sourceSheet,
    sourceRow,
    code,
    name,
    crsName,
    declaredRoomCount: declaredRoomCount ?? 0,
    remark: description || null,
    rooms,
    warnings,
    errors
  };
}

function parseRoomGroups(description: string) {
  const marker = description.match(/房间分布\s*[:：]/);
  if (!marker || marker.index === undefined) return [];
  const distribution = description.slice(marker.index + marker[0].length);
  const groups: Array<{ building: string; internalRooms: string[] }> = [];
  const pattern = /([^（()；;\n]+?)\s*[（(]([^）)]+)[）)]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(distribution))) {
    const building = match[1].replace(/^[、，,；;\s]+/, "").trim();
    const internalRooms = match[2]
      .split(/[、，,；;\/]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (building && internalRooms.length > 0) groups.push({ building, internalRooms });
  }
  return groups;
}

function joinRoomNo(building: string, internalRoom: string) {
  if (internalRoom.startsWith(building)) return internalRoom;
  return `${building}-${internalRoom}`.replace(/-{2,}/g, "-");
}

function isImportHeader(row: unknown[]) {
  const labels = new Set(row.map(toText));
  return REQUIRED_HEADERS.every((header) => labels.has(header));
}

function buildHeaderMap(row: unknown[]) {
  const map = new Map<string, number>();
  row.forEach((value, index) => {
    const label = toText(value);
    if (label) map.set(label, index);
  });
  return map;
}

function roomTypeKey(source: Pick<ParsedHotelRoomType, "sourceSheet" | "sourceRow">) {
  return `${source.sourceSheet}::${source.sourceRow}`;
}

function buildRoomTypeRemark(source: ParsedHotelRoomType) {
  const parts = [];
  if (source.crsName) parts.push(`CRS房型名称：${source.crsName}`);
  if (source.remark) parts.push(source.remark);
  const value = parts.join("\n").trim();
  return value || null;
}

function countActions(items: Array<{ action: HotelRoomImportAction }>) {
  const counts: Record<HotelRoomImportAction, number> = {
    create: 0,
    update: 0,
    unchanged: 0,
    conflict: 0
  };
  for (const item of items) counts[item.action] += 1;
  return counts;
}

function markDuplicateRoomTypes(
  roomTypes: ParsedHotelRoomType[],
  field: "code" | "name",
  label: string
) {
  const groups = new Map<string, ParsedHotelRoomType[]>();
  for (const roomType of roomTypes) {
    const value = roomType[field];
    if (!value) continue;
    const items = groups.get(value) ?? [];
    items.push(roomType);
    groups.set(value, items);
  }
  for (const [value, items] of groups) {
    if (items.length <= 1) continue;
    for (const item of items) item.errors.push(`${label}“${value}”在文件中重复`);
  }
}

function toPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(toText(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeNullable(value: string | null) {
  return value?.trim() || null;
}
