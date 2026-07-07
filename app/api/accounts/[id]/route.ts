import { NextRequest } from "next/server";
import { ensureBackendAccount, resolveRole, validateAdminAvailability, validateHotelBinding } from "@/lib/account-actions";
import { accountPublicSelect, toAccountPublic } from "@/lib/accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { accountUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;

  try {
    const { id } = await context.params;
    const account = await ensureBackendAccount(id);
    if (!account) return errorResponse("ACCOUNT_NOT_FOUND", "后台账号不存在", 404);
    return successResponse(toAccountPublic(account));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;

  try {
    const { id } = await context.params;
    const body = accountUpdateSchema.parse(await request.json());
    const before = await ensureBackendAccount(id);
    if (!before) return errorResponse("ACCOUNT_NOT_FOUND", "后台账号不存在", 404);

    const nextRoleCode = body.roleCode ?? before.roleCode;
    const nextStatus = body.status ?? before.status;
    const nextHotelId = Object.prototype.hasOwnProperty.call(body, "hotelId")
      ? body.hotelId ?? null
      : before.hotelId;
    const hotelError = await validateHotelBinding(nextRoleCode, nextHotelId);
    if (hotelError) return hotelError;
    const adminError = await validateAdminAvailability({
      targetId: id,
      targetRoleCode: before.roleCode,
      nextRoleCode,
      nextStatus,
      operatorId: user.id
    });
    if (adminError) return adminError;

    const role = body.roleCode ? await resolveRole(body.roleCode) : null;
    if (body.roleCode && !role) return errorResponse("ROLE_NOT_FOUND", "角色不存在", 422);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        phone: Object.prototype.hasOwnProperty.call(body, "phone") ? body.phone ?? null : undefined,
        roleCode: body.roleCode,
        roleId: role?.id,
        status: body.status,
        hotelId: nextRoleCode === "hotel_frontdesk" ? nextHotelId : null,
        remark: Object.prototype.hasOwnProperty.call(body, "remark") ? body.remark ?? null : undefined
      },
      select: accountPublicSelect
    });
    const account = toAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "UPDATE_ACCOUNT",
      targetType: "User",
      targetId: id,
      beforeData: toAccountPublic(before),
      afterData: account,
      remark: "编辑后台账号",
      ...getRequestMeta(request)
    });
    return successResponse(account, "修改后台账号成功");
  } catch (error) {
    return handleApiError(error);
  }
}
