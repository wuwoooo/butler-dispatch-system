import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/response";
import { getRequestUser } from "@/lib/auth";
import { requireRole } from "@/lib/permissions";
import type { AuthenticatedUser, RoleCode } from "@/types/auth";

export async function requireApiUser(request: NextRequest) {
  const user = await getRequestUser(request);

  if (!user) {
    return {
      user: null,
      response: errorResponse("UNAUTHORIZED", "请先登录", 401)
    };
  }

  return {
    user,
    response: null
  };
}

export async function requireApiRoles(
  request: NextRequest,
  roles: RoleCode[]
): Promise<
  | { user: AuthenticatedUser; response: null }
  | { user: null; response: ReturnType<typeof errorResponse> }
> {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return { user: null, response };
  }

  if (!requireRole(user, roles)) {
    return {
      user: null,
      response: errorResponse("FORBIDDEN", "没有权限访问该资源", 403)
    };
  }

  return { user, response: null };
}

export function getRequestMeta(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent")
  };
}
