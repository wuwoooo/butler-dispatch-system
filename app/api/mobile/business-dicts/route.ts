import { NextRequest } from "next/server";
import {
  editableBusinessDictTypes,
  isEditableBusinessDictType
} from "@/lib/business-config";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { getEnabledBusinessDictItems } from "@/lib/system-dicts";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, [
    "admin",
    "dispatcher",
    "hotel_frontdesk",
    "butler"
  ]);

  if (!user) {
    return response;
  }

  try {
    const dictType = request.nextUrl.searchParams.get("dictType");

    if (dictType) {
      if (!isEditableBusinessDictType(dictType)) {
        return errorResponse("DICT_TYPE_FORBIDDEN", "该配置分类不存在", 403);
      }

      const items = await getEnabledBusinessDictItems(dictType);
      return successResponse({ items });
    }

    const groups = Object.fromEntries(
      await Promise.all(
        editableBusinessDictTypes.map(async (type) => [
          type,
          await getEnabledBusinessDictItems(type)
        ])
      )
    );

    return successResponse({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}
