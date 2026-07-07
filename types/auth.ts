export const ROLE_CODES = [
  "admin",
  "hotel_frontdesk",
  "dispatcher",
  "butler",
  "finance"
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export type AuthenticatedUser = {
  id: string;
  username: string;
  name: string;
  roleCode: RoleCode;
  hotelId: string | null;
  butlerId: string | null;
};

export type SessionPayload = AuthenticatedUser & {
  sub: string;
};
