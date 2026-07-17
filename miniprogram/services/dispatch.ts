import { http } from "./request";

export function getAvailableButlers(orderId: string) {
  return http.get<{
    items: AnyRecord[];
    recommendation: AnyRecord;
    defaultSettlementAmount: string;
    settlementAmountsByVehicleType: Record<string, string>;
  }>(`/api/orders/${orderId}/available-butlers`, {
    loading: false
  });
}

export function dispatchOrder(
  orderId: string,
  butlerIds: string[],
  settlementAmount: string,
  remark?: string
) {
  return http.post(`/api/orders/${orderId}/dispatch`, {
    butlerIds,
    settlementAmount,
    amountConfirmed: true,
    remark
  });
}

export function cancelDispatchAssignment(orderId: string, assignmentId: string, remark?: string) {
  return http.post(`/api/orders/${orderId}/assignments/${assignmentId}/cancel`, { remark });
}
