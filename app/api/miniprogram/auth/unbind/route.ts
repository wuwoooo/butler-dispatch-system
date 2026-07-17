import { NextRequest } from "next/server";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { wechatLoginSchema } from "@/lib/validators";
import { exchangeMiniProgramCode, WechatLoginError } from "@/lib/wechat";

export async function POST(request: NextRequest) {
  try {
    const body = wechatLoginSchema.parse(await request.json());
    const session = await exchangeMiniProgramCode(body.code);
    const user = await prisma.user.findUnique({
      where: { wechatOpenId: session.openid },
      select: { id: true }
    });

    if (!user) {
      return successResponse({ id: null }, "小程序账号已解绑");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { wechatOpenId: null, wechatUnionId: null, miniProgramBoundAt: null }
    });
    await writeOperationLog({
      operatorId: user.id,
      operationType: "MINIPROGRAM_UNBIND",
      targetType: "User",
      targetId: user.id,
      remark: "小程序账号自行解绑",
      ...getRequestMeta(request)
    });
    return successResponse({ id: user.id }, "小程序账号已解绑");
  } catch (error) {
    if (error instanceof WechatLoginError) {
      return errorResponse(error.code, error.message, 422);
    }
    return handleApiError(error);
  }
}
