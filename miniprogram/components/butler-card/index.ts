Component({
  properties: {
    item: { type: Object, value: {} },
    selectable: { type: Boolean, value: false },
    selected: { type: Boolean, value: false }
  },
  data: {
    avatar: "?",
    reasonText: "",
    statusRing: "default" // available | on_leave | default
  },
  observers: {
    item(item: AnyRecord) {
      if (!item) return;
      let statusRing = "default";
      if (item.status === "available") {
        statusRing = "available";
      } else if (item.status === "on_leave") {
        statusRing = "on_leave";
      }
      this.setData({
        avatar: (item.name || "?").slice(0, 1),
        reasonText: Array.isArray(item.unavailableReasons)
          ? item.unavailableReasons.join("、")
          : "",
        statusRing
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.properties.item);
    }
  }
});
