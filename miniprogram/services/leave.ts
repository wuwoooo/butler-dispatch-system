import { buildQuery, http } from "./request";

export function getMyLeaves(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[]; pagination: AnyRecord }>(
    `/api/butler/leaves${buildQuery(params)}`,
    { loading: false }
  );
}

export function submitLeave(data: AnyRecord) {
  return http.post("/api/butler/leaves", data);
}

export function cancelLeave(id: string) {
  return http.post(`/api/butler/leaves/${id}/cancel`);
}

export function getLeaves(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[]; pagination: AnyRecord }>(
    `/api/leaves${buildQuery(params)}`,
    { loading: false }
  );
}

export function approveLeave(id: string) {
  return http.post(`/api/leaves/${id}/approve`);
}

export function rejectLeave(id: string, rejectReason: string) {
  return http.post(`/api/leaves/${id}/reject`, { rejectReason });
}
