import { createHash } from "crypto";
import { read, utils } from "xlsx";
import {
  detectVehicleType,
  recommendVehicleTypeByGuestCount,
  type VehicleTypeValue
} from "@/lib/vehicle-recommendation";

const REQUIRED_HEADERS = [
  "房号",
  "房类",
  "姓名",
  "接送人数",
  "预订人手机",
  "目的地",
  "接送时间",
  "车型",
  "收费",
  "备注"
] as const;

const MAX_IMPORT_ROWS = 500;

type PickupTypeValue = "airport" | "train";
type TransportDirectionValue = "pickup" | "dropoff";

type DetectedTransportMetadata = {
  pickupType: PickupTypeValue | null;
  transportDirection: TransportDirectionValue | null;
};

export type ParsedOrderImportRow = {
  sourceSheet: string;
  sourceRow: number;
  sourceHotelName: string | null;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  roomType: string | null;
  roomNo: string | null;
  pickupType: PickupTypeValue | null;
  transportDirection: TransportDirectionValue | null;
  serviceStartAt: string | null;
  serviceEndAt: string | null;
  arrivalStation: string;
  requestedVehicleInfo: string | null;
  requestedVehicleType: VehicleTypeValue | null;
  recommendedVehicleType: VehicleTypeValue;
  recommendationSource: "order_request" | "guest_count";
  settlementAmount: string | null;
  remark: string | null;
  errors: string[];
  warnings: string[];
};

export type ParsedOrderImportWorkbook = {
  rows: ParsedOrderImportRow[];
  sheetErrors: string[];
};

export function parseOrderImportWorkbook(
  data: ArrayBuffer,
  fileName: string
): ParsedOrderImportWorkbook {
  const extension = fileName.toLowerCase().match(/\.(xlsx|xls)$/)?.[1];

  if (!extension) {
    throw new Error("仅支持 .xls 或 .xlsx 文件");
  }

  const workbook = read(data, {
    type: "array",
    cellDates: true,
    cellFormula: false,
    dense: true
  });
  const rows: ParsedOrderImportRow[] = [];
  const sheetErrors: string[] = [];

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
    const headerRowIndex = matrix.findIndex((row) => isImportHeader(row));

    if (headerRowIndex < 0) {
      continue;
    }

    const metadataRows = matrix.slice(0, headerRowIndex);
    const sourceHotelName = findHotelName(metadataRows);
    const transport = detectTransportMetadata(metadataRows);
    const headerMap = buildHeaderMap(matrix[headerRowIndex]);

    for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const source = matrix[rowIndex];
      const parsed = parseDataRow({
        row: source,
        rowIndex,
        sheetName,
        sourceHotelName,
        pickupType: transport?.pickupType ?? null,
        transportDirection: transport?.transportDirection ?? null,
        headerMap
      });

      if (parsed) {
        rows.push(parsed);
      }

      if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`单次导入不能超过 ${MAX_IMPORT_ROWS} 条数据`);
      }
    }
  }

  if (rows.length === 0) {
    sheetErrors.push("未找到包含标准订单表头的有效数据行");
  }

  return { rows, sheetErrors };
}

export function createImportFingerprint(input: {
  hotelId: string;
  transportDirection: TransportDirectionValue;
  pickupType: PickupTypeValue;
  serviceStartAt: string | Date;
  guestPhone: string;
  roomNo?: string | null;
}) {
  const startAt = new Date(input.serviceStartAt);
  startAt.setSeconds(0, 0);
  const source = [
    input.hotelId,
    input.transportDirection,
    input.pickupType,
    startAt.toISOString(),
    normalizeText(input.guestPhone),
    normalizeText(input.roomNo)
  ].join("|");

  return createHash("sha256").update(source).digest("hex");
}

export function normalizeHotelName(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "").toLowerCase();
}

function parseDataRow(input: {
  row: unknown[];
  rowIndex: number;
  sheetName: string;
  sourceHotelName: string | null;
  pickupType: PickupTypeValue | null;
  transportDirection: TransportDirectionValue | null;
  headerMap: Map<string, number>;
}): ParsedOrderImportRow | null {
  const get = (header: string) => input.row[input.headerMap.get(header) ?? -1];
  const guestName = toText(get("姓名"));
  const guestPhone = toText(get("预订人手机"));
  const guestCount = toPositiveInteger(get("接送人数"));
  const arrivalStation = toText(get("目的地"));

  if (/^人数\s*[:：]?$/.test(guestName)) {
    return null;
  }

  if (!guestName && !guestPhone && !guestCount && !arrivalStation) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const serviceStart = toDate(get("接送时间"));
  const serviceEnd = serviceStart
    ? new Date(serviceStart.getTime() + 3 * 60 * 60 * 1000)
    : null;
  const requestedVehicleInfo = nullableTextValue(get("车型"));
  const requestedVehicleType = detectVehicleType(requestedVehicleInfo);
  const rawSettlementAmount = get("收费");
  const locationPickupType = detectPickupTypeFromLocation(arrivalStation);
  const pickupType = input.pickupType ?? locationPickupType;
  const recommendedVehicleType =
    requestedVehicleType ?? recommendVehicleTypeByGuestCount(guestCount || 1);
  const rawSettlementText = toText(rawSettlementAmount);
  const settlementAmount = rawSettlementText
    ? toMoneyString(rawSettlementAmount)
    : null;

  if (!guestName) errors.push("客人姓名不能为空");
  if (!guestPhone) errors.push("预订人手机不能为空");
  if (!guestCount) errors.push("接送人数必须为大于 0 的整数");
  if (!arrivalStation) errors.push("目的地不能为空");
  if (!serviceStart) errors.push("接送时间格式不正确");
  if (!pickupType || !input.transportDirection) {
    errors.push("无法从表格标题识别接机、送机、接站或送站");
  }
  if (rawSettlementText && settlementAmount === null) {
    errors.push("收费金额格式不正确");
  }
  if (requestedVehicleInfo && !requestedVehicleType) {
    warnings.push("原表车型无法识别，已按接送人数推荐");
  }
  if (!input.pickupType && locationPickupType) {
    warnings.push(
      locationPickupType === "train"
        ? `根据目的地“${arrivalStation}”识别为火车站`
        : `根据目的地“${arrivalStation}”识别为机场`
    );
  } else if (
    input.pickupType &&
    locationPickupType &&
    input.pickupType !== locationPickupType
  ) {
    warnings.push(
      `表格标题识别为${input.pickupType === "airport" ? "机场" : "火车站"}，但目的地“${arrivalStation}”通常表示${locationPickupType === "airport" ? "机场" : "火车站"}，请核对`
    );
  }

  return {
    sourceSheet: input.sheetName.trim() || input.sheetName,
    sourceRow: input.rowIndex + 1,
    sourceHotelName: input.sourceHotelName,
    guestName,
    guestPhone,
    guestCount,
    roomType: nullableTextValue(get("房类")),
    roomNo: nullableTextValue(get("房号")),
    pickupType,
    transportDirection: input.transportDirection,
    serviceStartAt: serviceStart?.toISOString() ?? null,
    serviceEndAt: serviceEnd?.toISOString() ?? null,
    arrivalStation,
    requestedVehicleInfo,
    requestedVehicleType,
    recommendedVehicleType,
    recommendationSource: requestedVehicleType ? "order_request" : "guest_count",
    settlementAmount,
    remark: nullableTextValue(get("备注")),
    errors,
    warnings
  };
}

function isImportHeader(row: unknown[]) {
  const labels = new Set(row.map((value) => normalizeText(value)));
  return REQUIRED_HEADERS.every((header) => labels.has(header));
}

function buildHeaderMap(row: unknown[]) {
  const map = new Map<string, number>();
  row.forEach((value, index) => {
    const label = normalizeText(value);
    if (label) map.set(label, index);
  });
  return map;
}

function findHotelName(rows: unknown[][]) {
  for (const row of rows) {
    for (const value of row) {
      const text = toText(value);
      if (text.endsWith("酒店")) return text;
    }
  }
  return null;
}

function detectTransportMetadata(rows: unknown[][]): DetectedTransportMetadata | null {
  const text = rows.flat().map(toText).filter(Boolean).join(" ");
  const specificText = text.replace(/接送机|接送站/g, "");

  if (specificText.includes("送机")) {
    return { pickupType: "airport" as const, transportDirection: "dropoff" as const };
  }
  if (specificText.includes("接机")) {
    return { pickupType: "airport" as const, transportDirection: "pickup" as const };
  }
  if (specificText.includes("送站")) {
    return { pickupType: "train" as const, transportDirection: "dropoff" as const };
  }
  if (specificText.includes("接站")) {
    return { pickupType: "train" as const, transportDirection: "pickup" as const };
  }

  const transportDirection = /离开|出发|送客/.test(specificText)
    ? "dropoff"
    : /抵达|到达|接客/.test(specificText)
      ? "pickup"
      : null;

  if (transportDirection) {
    return { pickupType: null, transportDirection };
  }

  return null;
}

export function detectPickupTypeFromLocation(value: unknown): PickupTypeValue | null {
  const text = normalizeText(value).replace(/\s+/g, "");

  if (!text) return null;
  if (/机场|航站楼/.test(text)) return "airport";
  if (/汽车站|客运站|公交站|地铁站|巴士站/.test(text)) return null;
  if (
    /火车站|高铁站|动车站|铁路站/.test(text) ||
    /站(?:[（(].*)?$/.test(text)
  ) {
    return "train";
  }

  return null;
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

function normalizeText(value: unknown) {
  return toText(value).trim();
}

function nullableTextValue(value: unknown) {
  const text = toText(value);
  return text || null;
}

function toPositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toMoneyString(value: unknown) {
  if (value === null || value === undefined || toText(value) === "") return null;
  const normalized = toText(value).replace(/[,¥￥\s]/g, "");
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [integer, fraction = ""] = normalized.split(".");
  return `${integer}.${fraction.padEnd(2, "0")}`;
}

function toDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(toText(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
