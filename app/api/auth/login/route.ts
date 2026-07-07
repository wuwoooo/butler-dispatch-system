import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME
} from "@/lib/auth-token";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifyPassword
} from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { getRequestMeta } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { username: body.username },
      select: {
        id: true,
        username: true,
        name: true,
        passwordHash: true,
        roleCode: true,
        hotelId: true,
        butlerId: true,
        status: true
      }
    });

    if (!user) {
      await writeOperationLog({
        operatorId: null,
        operationType: "LOGIN_FAILED",
        targetType: "User",
        targetId: body.username,
        remark: "后台登录失败：账号不存在",
        ...meta
      });
      return errorResponse("ACCOUNT_NOT_FOUND", "账号不存在", 401);
    }

    const passwordMatched = await verifyPassword(body.password, user.passwordHash);
    if (!passwordMatched) {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "LOGIN_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "后台登录失败：密码错误",
        ...meta
      });
      return errorResponse("INVALID_CREDENTIALS", "密码错误", 401);
    }

    if (user.status !== "active") {
      await writeOperationLog({
        operatorId: user.id,
        operationType: "LOGIN_FAILED",
        targetType: "User",
        targetId: user.id,
        remark: "后台登录失败：账号已停用",
        ...meta
      });
      return errorResponse("ACCOUNT_DISABLED", "账号已停用，请联系管理员", 403);
    }

    const authUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      roleCode: user.roleCode,
      hotelId: user.hotelId,
      butlerId: user.butlerId
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = await createSessionToken(authUser);
    const response = successResponse({ user: authUser }, "登录成功");

    response.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      getSessionCookieOptions()
    );

    await writeOperationLog({
      operatorId: user.id,
      operationType: "LOGIN_SUCCESS",
      targetType: "User",
      targetId: user.id,
      afterData: {
        username: user.username,
        roleCode: user.roleCode
      },
      remark: "登录成功",
      ...meta
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
