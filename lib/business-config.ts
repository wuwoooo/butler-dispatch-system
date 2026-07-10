export const editableBusinessDictTypes = [
  "leave_type",
  "reject_reason",
  "review_tag"
] as const;

export type EditableBusinessDictType = (typeof editableBusinessDictTypes)[number];

export const defaultBusinessDictItems: Array<{
  dictType: EditableBusinessDictType;
  label: string;
  value: string;
  sort: number;
}> = [
  { dictType: "leave_type", label: "事假", value: "personal", sort: 1 },
  { dictType: "leave_type", label: "病假", value: "sick", sort: 2 },
  { dictType: "leave_type", label: "休息", value: "rest", sort: 3 },
  { dictType: "leave_type", label: "其他", value: "other", sort: 4 },
  { dictType: "reject_reason", label: "时间冲突", value: "time_conflict", sort: 1 },
  { dictType: "reject_reason", label: "身体原因", value: "health_reason", sort: 2 },
  { dictType: "reject_reason", label: "临时有事", value: "temporary_matter", sort: 3 },
  { dictType: "reject_reason", label: "其他", value: "other", sort: 4 },
  { dictType: "review_tag", label: "准时", value: "ontime", sort: 1 },
  { dictType: "review_tag", label: "热情", value: "warm", sort: 2 },
  { dictType: "review_tag", label: "细心", value: "careful", sort: 3 },
  { dictType: "review_tag", label: "沟通顺畅", value: "smooth_communication", sort: 4 }
];

export const businessDictTypeMeta: Record<
  EditableBusinessDictType,
  {
    label: string;
    description: string;
    valueHint: string;
    usageLocations: string[];
  }
> = {
  leave_type: {
    label: "请假类型",
    description: "用于管家提交请假时选择，例如事假、病假、调休。",
    valueHint: "留空后自动生成系统内部值",
    usageLocations: ["管家端请假申请", "后台请假详情", "请假审核记录"]
  },
  reject_reason: {
    label: "拒单原因",
    description: "用于管家拒单时快速选择原因，例如时间冲突、身体原因。",
    valueHint: "留空后自动生成系统内部值",
    usageLocations: ["管家端拒单表单", "派单记录", "拒单统计导出"]
  },
  review_tag: {
    label: "评价标签",
    description: "用于前台或调配员评价管家时快速勾选标签，例如准时、热情、细心。",
    valueHint: "留空后自动生成系统内部值",
    usageLocations: ["前台评价表单", "调配员评价表单", "评价统计与筛选"]
  }
};

export function isEditableBusinessDictType(value: string): value is EditableBusinessDictType {
  return editableBusinessDictTypes.includes(value as EditableBusinessDictType);
}

export function normalizeBusinessDictValue(label: string) {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return `item_${Date.now()}`;
  }

  // If the label is Chinese, keep a readable fallback pattern instead of raw unicode-heavy keys.
  if (/^[\u4e00-\u9fa5_]+$/.test(normalized)) {
    return `item_${Date.now()}`;
  }

  return normalized.slice(0, 64);
}
