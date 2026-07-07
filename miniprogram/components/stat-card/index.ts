Component({
  properties: {
    label: { type: String, value: "" },
    value: { type: null, value: 0 },
    tone: { type: String, value: "blue" }, // blue | green | orange | red | cyan
    url: { type: String, value: "" },
    action: { type: String, value: "" },
    showDot: { type: Boolean, value: false },
    unit: { type: String, value: "" }
  },
  methods: {
    handleTap() {
      if (!this.properties.url && !this.properties.action) return;
      this.triggerEvent("tap", {
        url: this.properties.url,
        action: this.properties.action
      });
    }
  }
});
