Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: "选择实际时间" },
    mode: { type: String, value: "datetime" },
    initialValue: { type: String, value: "" }
  },
  data: {
    date: "",
    time: ""
  },
  observers: {
    visible(visible: boolean) {
      if (visible) this.resetToInitialValue();
    }
  },
  methods: {
    resetToInitialValue() {
      const initial = this.properties.initialValue ? new Date(this.properties.initialValue) : new Date();
      const value = Number.isNaN(initial.getTime()) ? new Date() : initial;
      this.setData({
        date: formatDate(value),
        time: `${pad(value.getHours())}:${pad(value.getMinutes())}`
      });
    },
    setDate(event: AnyRecord) {
      this.setData({ date: event.detail.value });
    },
    setTime(event: AnyRecord) {
      this.setData({ time: event.detail.value });
    },
    confirm() {
      const [year, month, day] = this.data.date.split("-").map(Number);
      const [hour, minute] = this.data.time.split(":").map(Number);
      const occurredAt = new Date(year, month - 1, day, hour, minute);
      this.triggerEvent("confirm", { occurredAt: occurredAt.toISOString() });
    },
    cancel() {
      this.triggerEvent("cancel");
    },
    noop() {
      // 防止点击面板内容透传。
    }
  }
});

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
