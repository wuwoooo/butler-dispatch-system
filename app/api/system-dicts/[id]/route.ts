import { NextRequest } from "next/server";
import {
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
import { systemDictUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = systemDictUpdateSchema.parse(await request.json());
    const before = await prisma.systemDict.findUnique({ where: { id } });

    if (!before) {
      return errorResponse("DICT_NOT_FOUND", "字典不存在", 404);
    }

    const isBusinessConfig = isEditableBusinessDictType(before.dictType);
    const isNotificationConfig =
      before.dictType === notificationConfigType && isNotificationConfigValue(before.value);

    if (!isBusinessConfig && !isNotificationConfig) {
      return errorResponse("DICT_TYPE_FORBIDDEN", "该配置不允许在业务配置中修改", 403);
    }

    if (body.dictType && body.dictType !== before.dictType) {
      return errorResponse("DICT_TYPE_FORBIDDEN", "不能改为受限的配置分类", 403);
    }

    const nextLabel = body.dictLabel ?? before.label;
    const nextValue =
      body.dictValue === undefined
        ? undefined
        : body.dictValue ?? normalizeBusinessDictValue(nextLabel);

    const updated = await prisma.systemDict.update({
      where: { id },
      data: {
        dictType: undefined,
        label: body.dictLabel ?? undefined,
        value: isNotificationConfig ? undefined : nextValue,
        sort: body.sortOrder ?? undefined,
        enabled: body.status ?? undefined,
        remark: body.remark === undefined ? undefined : body.remark
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_SYSTEM_DICT",
      targetType: "SystemDict",
      targetId: id,
      beforeData: before,
      afterData: updated,
      remark: "修改业务配置",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    return errorResponse("DICT_DELETE_DISABLED", `业务配置 ${id} 不支持删除，请改为停用`, 405);
  } catch (error) {
    return handleApiError(error);
  }
}
