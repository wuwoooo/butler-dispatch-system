import { RoleCode, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accountPublicSelect, isBackendAccountRole } from "@/lib/accounts";
import { errorResponse } from "@/lib/response";

export async function findAccount(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: accountPublicSelect
  });
}

export async function ensureBackendAccount(id: string) {
  const account = await findAccount(id);
  if (!account || !isBackendAccountRole(account.roleCode)) {
    return null;
  }

  return account;
}

export async function resolveRole(roleCode: RoleCode) {
  return prisma.role.findUnique({ where: { code: roleCode } });
}

export async function validateHotelBinding(
  roleCode: RoleCode,
  hotelId: string | null | undefined
) {
  if (roleCode !== RoleCode.hotel_frontdesk) {
    return null;
  }

  if (!hotelId) {
    return errorResponse("HOTEL_REQUIRED", "酒店前台账号必须绑定酒店", 422);
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true }
  });

  if (!hotel) {
    return errorResponse("HOTEL_NOT_FOUND", "所属酒店不存在", 422);
  }

  return null;
}

/** 避免禁用或降级系统内唯一的可用管理员。 */
export async function validateAdminAvailability(input: {
  targetId: string;
  targetRoleCode: RoleCode;
  nextRoleCode: RoleCode;
  nextStatus: UserStatus;
  operatorId: string;
}) {
  const becomesUnavailable =
    input.targetRoleCode === RoleCode.admin &&
    (input.nextRoleCode !== RoleCode.admin || input.nextStatus !== UserStatus.active);

  if (!becomesUnavailable) {
    return null;
  }

  if (input.targetId === input.operatorId) {
    return errorResponse("SELF_ADMIN_PROTECTED", "不能禁用或降级当前登录管理员", 422);
  }

  const otherActiveAdmins = await prisma.user.count({
    where: {
      roleCode: RoleCode.admin,
      status: UserStatus.active,
      id: { not: input.targetId }
    }
  });

  if (otherActiveAdmins === 0) {
    return errorResponse("LAST_ADMIN_PROTECTED", "不能禁用或降级系统唯一管理员", 422);
  }

  return null;
}
