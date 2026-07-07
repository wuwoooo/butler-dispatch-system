import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { abnormalResolveSchema } from "@/lib/validators";
import { writeOperationLog } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher"]);

  if (!user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const body = abnormalResolveSchema.parse(await request.json());
    const before = await prisma.abnormalRecord.findUnique({ where: { id } });

    if (!before) {
      return errorResponse("ABNORMAL_NOT_FOUND", "异常记录不存在", 404);
    }

    const updated = await prisma.abnormalRecord.update({
      where: { id },
      data: {
        status: body.status,
        handleResult: body.handleResult,
        handledAt: new Date(),
        handledById: user.id
      }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "RESOLVE_ABNORMAL_RECORD",
      targetType: "AbnormalRecord",
      targetId: id,
      beforeData: before,
      afterData: updated,
      remark: body.handleResult,
      ...getRequestMeta(request)
    });

    return successResponse(updated, "处理完成");
  } catch (error) {
    return handleApiError(error);
  }
}
