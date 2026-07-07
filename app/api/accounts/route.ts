import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { accountPublicSelect, managedAccountRoleCodes, toAccountPublic } from "@/lib/accounts";
import { resolveRole, validateHotelBinding } from "@/lib/account-actions";
import { hashPassword } from "@/lib/auth";
import { writeOperationLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { accountCreateSchema, accountListQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;

  try {
    const query = accountListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const where: Prisma.UserWhereInput = {
      roleCode: { in: [...managedAccountRoleCodes] }
    };

    if (query.username) where.username = { contains: query.username };
    if (query.name) where.name = { contains: query.name };
    if (query.phone) where.phone = { contains: query.phone };
    if (query.roleCode) where.roleCode = query.roleCode;
    if (query.status) where.status = query.status;
    if (query.hotelId) where.hotelId = query.hotelId;
    if (query.miniProgramBound !== undefined) {
      where.wechatOpenId = query.miniProgramBound ? { not: null } : null;
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: accountPublicSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.user.count({ where })
    ]);

    return successResponse({
      items: items.map(toAccountPublic),
      total,
      page: query.page,
      pageSize: query.pageSize
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["admin"]);
  if (!user) return response;

  try {
    const body = accountCreateSchema.parse(await request.json());
    const hotelError = await validateHotelBinding(body.roleCode, body.hotelId);
    if (hotelError) return hotelError;

    const role = await resolveRole(body.roleCode);
    if (!role) return errorResponse("ROLE_NOT_FOUND", "角色不存在，请先运行 seed", 422);

    const created = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        name: body.name,
        phone: body.phone ?? null,
        roleCode: body.roleCode,
        roleId: role.id,
        hotelId: body.roleCode === "hotel_frontdesk" ? body.hotelId : null,
        status: body.status,
        remark: body.remark ?? null
      },
      select: accountPublicSelect
    });

    const account = toAccountPublic(created);
    await writeOperationLog({
      operatorId: user.id,
      operationType: "CREATE_ACCOUNT",
      targetType: "User",
      targetId: created.id,
      afterData: account,
      remark: "新增后台账号",
      ...getRequestMeta(request)
    });
    return successResponse(account, "创建后台账号成功", { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
