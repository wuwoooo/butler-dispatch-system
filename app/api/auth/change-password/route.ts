import { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiUser } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiUser(request);
  if (!user) return response;

  try {
    const body = changePasswordSchema.parse(await request.json());
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true }
    });

    if (!account) {
      return errorResponse("ACCOUNT_NOT_FOUND", "账号不存在", 404);
    }

    const passwordMatched = await verifyPassword(
      body.currentPassword,
      account.passwordHash
    );

    if (!passwordMatched) {
      return errorResponse("INVALID_CURRENT_PASSWORD", "原密码错误", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) }
    });

    await writeOperationLog({
      operatorId: user.id,
      operationType: "CHANGE_PASSWORD",
      targetType: "User",
      targetId: user.id,
      remark: "用户修改自己的登录密码",
      ...getRequestMeta(request)
    });

    return successResponse({ id: user.id }, "密码修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}
