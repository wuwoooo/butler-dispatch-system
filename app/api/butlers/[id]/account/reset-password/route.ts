import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { findButlerAccountDetail } from "@/lib/butler-accounts";
import { writeOperationLog } from "@/lib/logger";
import { generateSixDigitPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const butler = await findButlerAccountDetail(id);
    if (!butler) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    if (!butler.user) return errorResponse("BUTLER_ACCOUNT_NOT_FOUND", "该管家尚未开通登录账号", 404);
    const newPassword = generateSixDigitPassword();
    await prisma.user.update({
      where: { id: butler.user.id },
      data: { passwordHash: await hashPassword(newPassword) }
    });
    await writeOperationLog({
      operatorId: user.id,
      operationType: "RESET_BUTLER_ACCOUNT_PASSWORD",
      targetType: "User",
      targetId: butler.user.id,
      remark: "重置管家账号密码",
      ...getRequestMeta(request)
    });
    return successResponse(
      { id: butler.user.id, newPassword },
      "管家账号密码已重置"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
