import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signAuthToken,
  verifyAuthToken
} from "@/lib/auth-token";
import type { AuthenticatedUser, SessionPayload } from "@/types/auth";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(user: AuthenticatedUser) {
  const payload: SessionPayload = {
    ...user,
    sub: user.id
  };

  return signAuthToken(payload);
}

export function getSessionCookieOptions() {
  const secureOverride = process.env.AUTH_COOKIE_SECURE;

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureOverride
      ? secureOverride === "true"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        username: true,
        name: true,
        roleCode: true,
        hotelId: true,
        butlerId: true,
        status: true
      }
    });

    if (!user || user.status !== "active") {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roleCode: user.roleCode,
      hotelId: user.hotelId,
      butlerId: user.butlerId
    };
  } catch {
    return null;
  }
}

export async function getRequestUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  // 后台使用 HttpOnly Cookie，小程序 API 使用同一签名机制的 Bearer Token。
  const token = bearerToken || request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        username: true,
        name: true,
        roleCode: true,
        hotelId: true,
        butlerId: true,
        status: true
      }
    });

    if (!user || user.status !== "active") {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roleCode: user.roleCode,
      hotelId: user.hotelId,
      butlerId: user.butlerId
    };
  } catch {
    return null;
  }
}
