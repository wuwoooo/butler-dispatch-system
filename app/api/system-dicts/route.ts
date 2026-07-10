import { NextRequest } from "next/server";
import {
  editableBusinessDictTypes,
  isEditableBusinessDictType,
  normalizeBusinessDictValue
} from "@/lib/business-config";
import {
  isNotificationConfigValue,
  notificationConfigType
} from "@/lib/notification-config";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import {
  systemDictCreateSchema,
  systemDictQuerySchema
} from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";
import { ensureDefaultBusinessDicts } from "@/lib/system-dicts";

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
    const query = systemDictQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (query.scope === "business" && query.dictType && !isEditableBusinessDictType(query.dictType)) {
      return errorResponse("DICT_TYPE_FORBIDDEN", "该配置分类不在业务配置范围内", 403);
    }
    if (query.scope === "notification" && query.dictType && query.dictType !== notificationConfigType) {
      return errorResponse("DICT_TYPE_FORBIDDEN", "该配置分类不在通知配置范围内", 403);
    }
    if (query.scope === "business") {
      await ensureDefaultBusinessDicts();
    }
    const where = {
      dictType: query.scope === "business"
        ? query.dictType
          ? query.dictType
          : { in: Array.from(editableBusinessDictTypes) }
        : query.scope === "notification"
          ? notificationConfigType
        : query.dictType || undefined,
      enabled: query.enabled,
      OR: query.keyword
        ? [
            { label: { contains: query.keyword } },
            { value: { contains: query.keyword } },
            { remark: { contains: query.keyword } }
          ]
        : undefined
    };

    const [items, total] = await Promise.all([
      prisma.systemDict.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ dictType: "asc" }, { sort: "asc" }, { createdAt: "desc" }]
      }),
      prisma.systemDict.count({ where })
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
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const query = systemDictQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const body = systemDictCreateSchema.parse(await request.json());
    if (query.scope === "notification") {
      if (body.dictType !== notificationConfigType) {
        return errorResponse("DICT_TYPE_FORBIDDEN", "只能初始化通知配置", 403);
      }
      if (!body.dictValue || !isNotificationConfigValue(body.dictValue)) {
        return errorResponse("DICT_VALUE_FORBIDDEN", "通知事件类型不合法", 422);
      }
    } else if (!isEditableBusinessDictType(body.dictType)) {
      return errorResponse("DICT_TYPE_FORBIDDEN", "该配置分类不允许在业务配置中维护", 403);
    }

    const dictValue = body.dictValue ?? normalizeBusinessDictValue(body.dictLabel);
    const created = await prisma.systemDict.create({
      data: {
        dictType: body.dictType,
        label: body.dictLabel,
        value: dictValue,
        sort: body.sortOrder,
        enabled: body.status,
        remark: body.remark ?? null
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_SYSTEM_DICT",
      targetType: "SystemDict",
      targetId: created.id,
      afterData: created,
      remark: `新增业务配置 ${body.dictType}/${dictValue}`,
      ...getRequestMeta(request)
    });

    return successResponse(created, "创建成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
