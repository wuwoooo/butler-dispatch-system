import { buildQuery, http } from "./request";

export function getButlers() {
  return http.get<{ items: AnyRecord[] }>("/api/butlers", { loading: false });
}

export function getButlerDetail(id: string) {
  return http.get<AnyRecord>(`/api/butlers/${id}`);
}

export function getButlerStatistics(params: AnyRecord = {}) {
  return http.get<AnyRecord>(`/api/butler/statistics${buildQuery(params)}`, {
    loading: false
  });
}

export function getButlerOrderRecords(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[]; pagination: AnyRecord }>(
    `/api/butler/order-records${buildQuery(params)}`,
    { loading: false }
  );
}

export function getButlerReviews(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[] }>(`/api/butler/reviews${buildQuery(params)}`, {
    loading: false
  });
}

export function getAllButlerStatistics(params: AnyRecord = {}) {
  return http.get<{ items: AnyRecord[] }>(`/api/statistics/butlers${buildQuery(params)}`, {
    loading: false
  });
}
