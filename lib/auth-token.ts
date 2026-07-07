import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload } from "@/types/auth";

export const AUTH_COOKIE_NAME = "butler_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "butler-dispatch-development-secret";

  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  return {
    id: String(payload.id),
    sub: String(payload.sub),
    username: String(payload.username),
    name: String(payload.name),
    roleCode: String(payload.roleCode),
    hotelId: payload.hotelId ? String(payload.hotelId) : null,
    butlerId: payload.butlerId ? String(payload.butlerId) : null
  } as SessionPayload;
}
