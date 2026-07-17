import type { AuthenticatedUser, RoleCode } from "@/types/auth";

export type Resource =
  | "dashboard"
  | "orders"
  | "dispatch"
  | "butlers"
  | "hotels"
  | "leaves"
  | "reviews"
  | "finance"
  | "notifications"
  | "settings"
  | "accounts"
  | "logs"
  | "abnormalRecords"
  | "users";

export type Action = "view" | "create" | "update" | "delete" | "export";

type PermissionMatrix = Record<RoleCode, Partial<Record<Resource, Action[]>>>;

export const permissionMatrix: PermissionMatrix = {
  admin: {
    dashboard: ["view"],
    orders: ["view", "create", "update", "delete"],
    dispatch: ["view", "create", "update"],
    butlers: ["view", "create", "update", "delete"],
    hotels: ["view", "create", "update", "delete"],
    leaves: ["view", "create", "update"],
    reviews: ["view", "create", "update"],
    finance: ["view", "export", "update"],
    notifications: ["view"],
    settings: ["view", "create", "update"],
    accounts: ["view", "create", "update"],
    logs: ["view"],
    abnormalRecords: ["view", "create", "update"],
    users: ["view", "create", "update", "delete"]
  },
  hotel_frontdesk: {
    dashboard: ["view"],
    orders: ["view", "create", "update"],
    reviews: ["view", "create"],
    finance: ["view", "export"],
    notifications: ["view"],
    abnormalRecords: ["view", "create"],
    hotels: ["view"]
  },
  dispatcher: {
    dashboard: ["view"],
    orders: ["view", "update"],
    dispatch: ["view", "create", "update"],
    butlers: ["view", "create", "update"],
    hotels: ["view"],
    leaves: ["view", "update"],
    reviews: ["view", "create"],
    finance: ["view", "export"],
    notifications: ["view"],
    abnormalRecords: ["view", "create", "update"],
    logs: ["view"]
  },
  butler: {
    dashboard: ["view"],
    orders: ["view"],
    leaves: ["view", "create"],
    reviews: ["view"],
    notifications: ["view"],
    abnormalRecords: ["view"]
  },
  finance: {
    dashboard: ["view"],
    orders: ["view"],
    butlers: ["view"],
    leaves: ["view"],
    reviews: ["view"],
    finance: ["view", "export"],
    notifications: ["view"],
    abnormalRecords: ["view"],
    logs: ["view"],
    hotels: ["view"]
  }
};

export const pathResourceMap: Array<[string, Resource]> = [
  ["/dashboard", "dashboard"],
  ["/orders", "orders"],
  ["/dispatch", "dispatch"],
  ["/butlers", "butlers"],
  ["/hotels", "hotels"],
  ["/leaves", "leaves"],
  ["/reviews", "reviews"],
  ["/finance", "finance"],
  ["/notifications", "notifications"],
  ["/settings", "settings"],
  ["/accounts", "accounts"],
  ["/logs", "logs"],
  ["/abnormal-records", "abnormalRecords"]
];

export function canAccess(
  user: Pick<AuthenticatedUser, "roleCode"> | null | undefined,
  resource: Resource,
  action: Action = "view"
) {
  if (!user) {
    return false;
  }

  return permissionMatrix[user.roleCode][resource]?.includes(action) ?? false;
}

export function canImportOrders(
  user: Pick<AuthenticatedUser, "roleCode"> | null | undefined
) {
  return Boolean(
    user &&
      ["admin", "hotel_frontdesk"].includes(user.roleCode) &&
      canAccess(user, "orders", "create")
  );
}

export function canImportHotelRooms(
  user: Pick<AuthenticatedUser, "roleCode"> | null | undefined
) {
  return Boolean(
    user?.roleCode === "admin" &&
      canAccess(user, "hotels", "create") &&
      canAccess(user, "hotels", "update")
  );
}

export function requireRole(
  user: Pick<AuthenticatedUser, "roleCode"> | null | undefined,
  roles: RoleCode[]
) {
  return Boolean(user && roles.includes(user.roleCode));
}

export function resolveResourceFromPath(pathname: string) {
  return pathResourceMap.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}
