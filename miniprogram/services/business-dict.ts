import { buildQuery, http } from "./request";

export type BusinessDictItem = {
  id: string;
  dictType: string;
  label: string;
  value: string;
  sort: number;
};

export function getBusinessDictItems(dictType: string) {
  return http.get<{ items: BusinessDictItem[] }>(
    `/api/mobile/business-dicts${buildQuery({ dictType })}`,
    { loading: false }
  );
}
