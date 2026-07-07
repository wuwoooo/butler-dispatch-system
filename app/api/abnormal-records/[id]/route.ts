import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { abnormalUpdateSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = abnormalUpdateSchema.parse(await request.json());
    const before = await prisma.abnormalRecord.findUnique({ where: { id } });

    if (!before) {
      return errorResponse("ABNORMAL_NOT_FOUND", "异常记录不存在", 404);
    }

    const updated = await prisma.abnormalRecord.update({
      where: { id },
      data: {
        abnormalType: body.abnormalType ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
        handleResult: body.handleResult === undefined ? undefined : body.handleResult
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_ABNORMAL_RECORD",
      targetType: "AbnormalRecord",
      targetId: id,
      beforeData: before,
      afterData: updated,
      remark: "更新异常记录",
      ...getRequestMeta(request)
    });

    return successResponse(updated, "更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}
