import { buildQuery, http } from "./request";

export function getButlerOrders() {
  return http.get<{ groups: AnyRecord }>("/api/butler/my-orders", { loading: false });
}

export function getOrders(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[]; pagination: AnyRecord }>(
    `/api/orders${buildQuery(params)}`,
    { loading: false }
  );
}

export function getOrderDetail(orderId: string) {
  return http.get<AnyRecord>(`/api/orders/${orderId}`);
}

export function confirmOrder(assignmentId: string) {
  return http.post(`/api/butler/orders/${assignmentId}/confirm`);
}

export function rejectOrder(assignmentId: string, rejectReason: string) {
  return http.post(`/api/butler/orders/${assignmentId}/reject`, { rejectReason });
}

export function pickedGuest(assignmentId: string) {
  return http.post(`/api/butler/orders/${assignmentId}/picked-guest`);
}

export function completeOrder(assignmentId: string) {
  return http.post(`/api/butler/orders/${assignmentId}/complete`);
}
