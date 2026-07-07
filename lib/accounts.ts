import { Prisma, RoleCode } from "@prisma/client";

export const backendAccountRoleCodes = [
  RoleCode.admin,
  RoleCode.dispatcher,
  RoleCode.hotel_frontdesk,
  RoleCode.finance
] as const;

export const managedAccountRoleCodes = [
  ...backendAccountRoleCodes,
  RoleCode.butler
] as const;

export const miniProgramRoleCodes = [
  RoleCode.butler,
  RoleCode.dispatcher,
  RoleCode.admin
] as const;

export const accountPublicSelect = {
  id: true,
  username: true,
  name: true,
  phone: true,
  roleCode: true,
  status: true,
  hotelId: true,
  butlerId: true,
  remark: true,
  lastLoginAt: true,
  lastMiniProgramLoginAt: true,
  miniProgramBoundAt: true,
  wechatOpenId: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: { id: true, code: true, name: true }
  },
  hotel: {
    select: { id: true, name: true }
  },
  butler: {
    select: { id: true, name: true, phone: true, status: true }
  }
} satisfies Prisma.UserSelect;

export type AccountUserRecord = Prisma.UserGetPayload<{
  select: typeof accountPublicSelect;
}>;

/** 账号数据对外输出时只提供绑定状态，openid 始终不直接返回。 */
export function toAccountPublic(user: AccountUserRecord) {
  const { wechatOpenId, ...safeUser } = user;
  return {
    ...safeUser,
    miniProgramBound: Boolean(wechatOpenId)
  };
}

export function isBackendAccountRole(roleCode: RoleCode) {
  return backendAccountRoleCodes.includes(
    roleCode as (typeof backendAccountRoleCodes)[number]
  );
}

export function canUseMiniProgram(roleCode: RoleCode) {
  return miniProgramRoleCodes.includes(
    roleCode as (typeof miniProgramRoleCodes)[number]
  );
}

export function maskOpenId(openId: string | null | undefined) {
  if (!openId) {
    return "未绑定";
  }

  if (openId.length <= 8) {
    return `${openId.slice(0, 2)}****`;
  }

  return `${openId.slice(0, 4)}****${openId.slice(-4)}`;
}
