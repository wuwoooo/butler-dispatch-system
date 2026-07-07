import { NextRequest } from "next/server";
import { accountPublicSelect, canUseMiniProgram, toAccountPublic } from "@/lib/accounts";
import { createSessionToken, verifyPassword } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { miniProgramBindSchema } from "@/lib/validators";
import { exchangeMiniProgramCode, WechatLoginError } from "@/lib/wechat";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);
  let username: string | null = null;
  try {
    const body = miniProgramBindSchema.parse(await request.json());
    username = body.username;
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: body.username },
          { phone: body.username }
        ]
      },
      take: 2,
      select: { ...accountPublicSelect, passwordHash: true }
    });
    if (users.length > 1) {
      await writeOperationLog({
        operatorId: null,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: body.username,
        remark: "小程序账号绑定失败：用户名与手机号匹配到不同账号",
        ...meta
      });
      return errorResponse("ACCOUNT_IDENTIFIER_CONFLICT", "账号标识冲突，请联系管理员", 409);
    }

    const user = users[0] ?? null;
    const passwordMatched = user
      ? await verifyPassword(body.password, user.passwordHash)
      : false;

    if (!user || !passwordMatched) {
      await writeOperationLog({
        operatorId: null,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: body.username,
        remark: "小程序账号绑定失败：账号或密码错误",
        ...meta
      });
      return errorResponse("INVALID_CREDENTIALS", "账号或密码错误", 401);
    }
    if (user.status !== "active") {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序账号绑定失败：账号已停用",
        ...meta
      });
      return errorResponse("ACCOUNT_DISABLED", "账号已停用，无法绑定小程序", 403);
    }
    if (!canUseMiniProgram(user.roleCode)) {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序账号绑定失败：当前角色不支持小程序",
        ...meta
      });
      return errorResponse("MINIPROGRAM_ROLE_NOT_ALLOWED", "当前角色暂不支持小程序端使用，请使用后台系统", 403);
    }

    const session = await exchangeMiniProgramCode(body.code);
    if (user.wechatOpenId && user.wechatOpenId !== session.openid) {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序账号绑定失败：账号已绑定其他微信",
        ...meta
      });
      return errorResponse("ACCOUNT_ALREADY_BOUND", "该系统账号已绑定其他微信", 409);
    }

    const boundUser = await prisma.user.findUnique({
      where: { wechatOpenId: session.openid },
      select: { id: true }
    });
    if (boundUser && boundUser.id !== user.id) {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序账号绑定失败：微信已绑定其他账号",
        ...meta
      });
      return errorResponse("WECHAT_ALREADY_BOUND", "该微信已绑定其他系统账号", 409);
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        wechatOpenId: session.openid,
        wechatUnionId: session.unionid ?? null,
        miniProgramBoundAt: user.miniProgramBoundAt ?? now,
        lastMiniProgramLoginAt: now
      },
      select: accountPublicSelect
    });
    const authUser = {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      roleCode: updated.roleCode,
      hotelId: updated.hotelId,
      butlerId: updated.butlerId
    };
    const token = await createSessionToken(authUser);
    const safeUser = toAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "MINIPROGRAM_BIND_SUCCESS",
      targetType: "User",
      targetId: user.id,
      afterData: { roleCode: user.roleCode, miniProgramBound: true },
      remark: "小程序账号绑定成功",
      ...meta
    });
    return successResponse({ token, user: safeUser }, "小程序账号绑定成功");
  } catch (error) {
    if (error instanceof WechatLoginError) {
      await writeOperationLog({
        operatorId: null,
        operationType: "MINIPROGRAM_BIND_FAILED",
        targetType: "User",
        targetId: username,
        remark: `小程序账号绑定失败：${error.message}`,
        ...meta
      });
      return errorResponse(error.code, error.message, 422);
    }
    return handleApiError(error);
  }
}
