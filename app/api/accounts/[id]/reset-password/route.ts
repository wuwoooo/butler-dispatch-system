import { NextRequest } from "next/server";
import { findAccount } from "@/lib/account-actions";
import { hashPassword } from "@/lib/auth";
import { isBackendAccountRole } from "@/lib/accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { resetPasswordSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const body = resetPasswordSchema.parse(await request.json());
    const account = await findAccount(id);
    if (!account) return errorResponse("ACCOUNT_NOT_FOUND", "账号不存在", 404);
    if (!isBackendAccountRole(account.roleCode) && account.roleCode !== "butler") {
      return errorResponse("ACCOUNT_NOT_FOUND", "账号不存在", 404);
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(body.newPassword) }
    });
    await writeOperationLog({
      operatorId: user.id,
      operationType:
        account.roleCode === "butler"
          ? "RESET_BUTLER_ACCOUNT_PASSWORD"
          : "RESET_ACCOUNT_PASSWORD",
      targetType: "User",
      targetId: id,
      remark:
        account.roleCode === "butler"
          ? "重置管家账号密码"
          : "重置后台账号密码",
      ...getRequestMeta(request)
    });
    return successResponse({ id }, "密码重置成功");
  } catch (error) {
    return handleApiError(error);
  }
}
