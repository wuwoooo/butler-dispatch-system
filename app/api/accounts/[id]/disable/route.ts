import { UserStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ensureBackendAccount, validateAdminAvailability } from "@/lib/account-actions";
import { accountPublicSelect, toAccountPublic } from "@/lib/accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const before = await ensureBackendAccount(id);
    if (!before) return errorResponse("ACCOUNT_NOT_FOUND", "后台账号不存在", 404);
    const adminError = await validateAdminAvailability({
      targetId: id,
      targetRoleCode: before.roleCode,
      nextRoleCode: before.roleCode,
      nextStatus: UserStatus.disabled,
      operatorId: user.id
    });
    if (adminError) return adminError;
    if (before.status === UserStatus.disabled) return successResponse(toAccountPublic(before), "账号已停用");

    const updated = await prisma.user.update({
      where: { id },
      data: { status: UserStatus.disabled },
      select: accountPublicSelect
    });
    const account = toAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "DISABLE_ACCOUNT",
      targetType: "User",
      targetId: id,
      beforeData: toAccountPublic(before),
      afterData: account,
      remark: "停用后台账号",
      ...getRequestMeta(request)
    });
    return successResponse(account, "账号已停用");
  } catch (error) {
    return handleApiError(error);
  }
}
