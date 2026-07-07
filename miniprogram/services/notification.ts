import { buildQuery, http } from "./request";

export function getNotifications(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[]; pagination: AnyRecord }>(
    `/api/notifications${buildQuery(params)}`,
    { loading: false }
  );
}

export function getUnreadCount() {
  return http.get<{ count: number }>("/api/notifications/unread-count", {
    loading: false,
    silent: true
  });
}

export function readNotification(id: string) {
  return http.post(`/api/notifications/${id}/read`, {}, { loading: false });
}

export function readAllNotifications() {
  return http.post("/api/notifications/read-all");
}
