import { NextRequest } from "next/server";
import { accountPublicSelect, canUseMiniProgram, toAccountPublic } from "@/lib/accounts";
import { createSessionToken } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { wechatLoginSchema } from "@/lib/validators";
import { exchangeMiniProgramCode, WechatLoginError } from "@/lib/wechat";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);
  try {
    const body = wechatLoginSchema.parse(await request.json());
    const session = await exchangeMiniProgramCode(body.code);
    const user = await prisma.user.findUnique({
      where: { wechatOpenId: session.openid },
      select: accountPublicSelect
    });

    if (!user) {
      return successResponse({ needBind: true }, "请绑定系统账号");
    }
    if (user.status !== "active") {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_LOGIN_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序自动登录失败：账号已停用",
        ...meta
      });
      return errorResponse("ACCOUNT_DISABLED", "账号已停用，无法登录小程序", 403);
    }
    if (!canUseMiniProgram(user.roleCode)) {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "MINIPROGRAM_LOGIN_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "小程序自动登录失败：当前角色不支持小程序",
        ...meta
      });
      return errorResponse("MINIPROGRAM_ROLE_NOT_ALLOWED", "当前角色暂不支持小程序端使用，请使用后台系统", 403);
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastMiniProgramLoginAt: now }
    });
    const authUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      roleCode: user.roleCode,
      hotelId: user.hotelId,
      butlerId: user.butlerId
    };
    const token = await createSessionToken(authUser);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "MINIPROGRAM_AUTO_LOGIN_SUCCESS",
      targetType: "User",
      targetId: user.id,
      afterData: { roleCode: user.roleCode },
      remark: "小程序自动登录成功",
      ...meta
    });
    return successResponse({ needBind: false, token, user: toAccountPublic({ ...user, lastMiniProgramLoginAt: now }) });
  } catch (error) {
    if (error instanceof WechatLoginError) {
      await writeOperationLog({
        operatorId: null,
        operationType: "MINIPROGRAM_LOGIN_FAILED",
        targetType: "User",
        remark: `小程序自动登录失败：${error.message}`,
        ...meta
      });
      return errorResponse(error.code, error.message, 422);
    }
    return handleApiError(error);
  }
}
