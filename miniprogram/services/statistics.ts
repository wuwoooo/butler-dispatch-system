import { http } from "./request";

export function getButlerDashboard() {
  return http.get<AnyRecord>("/api/mobile/dashboard/butler", { loading: false });
}

export function getDispatcherDashboard() {
  return http.get<AnyRecord>("/api/mobile/dashboard/dispatcher", { loading: false });
}

