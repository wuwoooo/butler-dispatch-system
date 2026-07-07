import { http } from "./request";

export function getAvailableButlers(orderId: string) {
  return http.get<{ items: AnyRecord[] }>(`/api/orders/${orderId}/available-butlers`, {
    loading: false
  });
}

export function dispatchOrder(orderId: string, butlerIds: string[], remark?: string) {
  return http.post(`/api/orders/${orderId}/dispatch`, { butlerIds, remark });
}

export function cancelDispatchAssignment(orderId: string, assignmentId: string, remark?: string) {
  return http.post(`/api/orders/${orderId}/assignments/${assignmentId}/cancel`, { remark });
}
