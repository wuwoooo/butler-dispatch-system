import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { canAccess, resolveResourceFromPath } from "@/lib/permissions";

const publicApiPaths = ["/api/auth/login", "/api/auth/logout"];
const publicPagePaths = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    isStaticAsset(pathname) ||
    publicApiPaths.includes(pathname) ||
    pathname.startsWith("/api/miniprogram/")
  ) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const token = bearerToken || request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isApiRoute = pathname.startsWith("/api");

  let user = null;

  if (token) {
    try {
      user = await verifyAuthToken(token);
    } catch {
      user = null;
    }
  }

  if (publicPagePaths.includes(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "请先登录"
          }
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isApiRoute) {
    const resource = resolveResourceFromPath(pathname);

    if (resource && !canAccess(user, resource, "view")) {
      return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
    }
  }

  return NextResponse.next();
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
