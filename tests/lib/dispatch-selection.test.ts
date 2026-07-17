import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeButlerSelectionForMode,
  toggleButlerSelection
} from "@/lib/dispatch-selection";

test("默认单选时选择新管家会替换原选择", () => {
  assert.deepEqual(
    toggleButlerSelection({
      selectedIds: ["butler-a"],
      butlerId: "butler-b",
      multiple: false
    }),
    ["butler-b"]
  );
});

test("默认单选时再次选择当前管家会取消选择", () => {
  assert.deepEqual(
    toggleButlerSelection({
      selectedIds: ["butler-a"],
      butlerId: "butler-a",
      multiple: false
    }),
    []
  );
});

test("打开多选后可以累加和取消管家", () => {
  const selected = toggleButlerSelection({
    selectedIds: ["butler-a"],
    butlerId: "butler-b",
    multiple: true
  });
  assert.deepEqual(selected, ["butler-a", "butler-b"]);
  assert.deepEqual(
    toggleButlerSelection({
      selectedIds: selected,
      butlerId: "butler-a",
      multiple: true
    }),
    ["butler-b"]
  );
});

test("关闭多选时只保留最近选择的管家", () => {
  assert.deepEqual(
    normalizeButlerSelectionForMode(
      ["butler-a", "butler-b", "butler-c"],
      false
    ),
    ["butler-c"]
  );
});
