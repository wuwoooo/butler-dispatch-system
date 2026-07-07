import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { generateButlerUsername } from "@/lib/butler-account";
import { findButlerAccountDetail, toButlerAccountPublic } from "@/lib/butler-accounts";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { butlerAccountCreateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireApiRoles(request, ["admin", "dispatcher"]);
  if (!user) return response;
  try {
    const { id } = await context.params;
    const body = butlerAccountCreateSchema.parse(await request.json());
    const before = await findButlerAccountDetail(id);
    if (!before) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    if (before.user) return errorResponse("BUTLER_ACCOUNT_EXISTS", "该管家已开通登录账号", 409);
    const role = await prisma.role.findUnique({ where: { code: "butler" } });
    if (!role) return errorResponse("ROLE_NOT_FOUND", "管家角色不存在，请先运行 seed", 422);

    await prisma.user.create({
      data: {
        username: await generateButlerUsername(before.name),
        passwordHash: await hashPassword(body.password),
        name: before.name,
        phone: before.phone,
        roleCode: "butler",
        roleId: role.id,
        butlerId: id,
        status: "active"
      }
    });
    const updated = await findButlerAccountDetail(id);
    if (!updated) return errorResponse("BUTLER_NOT_FOUND", "管家不存在", 404);
    const result = toButlerAccountPublic(updated);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_BUTLER_ACCOUNT",
      targetType: "User",
      targetId: updated.user?.id,
      afterData: result,
      remark: "为已有管家开通登录账号",
      ...getRequestMeta(request)
    });
    return successResponse(result, "管家账号开通成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
