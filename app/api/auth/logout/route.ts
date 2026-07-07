import { AUTH_COOKIE_NAME } from "@/lib/auth-token";
import { getSessionCookieOptions } from "@/lib/auth";
import { successResponse } from "@/lib/response";

export async function POST() {
  const response = successResponse(null, "已退出登录");

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });

  return response;
}
