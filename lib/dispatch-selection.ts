export function toggleButlerSelection(input: {
  selectedIds: string[];
  butlerId: string;
  multiple: boolean;
}) {
  if (input.selectedIds.includes(input.butlerId)) {
    return input.selectedIds.filter((id) => id !== input.butlerId);
  }

  return input.multiple
    ? [...input.selectedIds, input.butlerId]
    : [input.butlerId];
}

export function normalizeButlerSelectionForMode(
  selectedIds: string[],
  multiple: boolean
) {
  if (multiple || selectedIds.length <= 1) {
    return selectedIds;
  }

  return selectedIds.slice(-1);
}
