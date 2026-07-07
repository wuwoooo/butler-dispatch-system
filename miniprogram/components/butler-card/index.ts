Component({
  properties: {
    item: { type: Object, value: {} },
    selectable: { type: Boolean, value: false },
    selected: { type: Boolean, value: false }
  },
  data: {
    avatar: "?",
    reasonText: ""
  },
  observers: {
    item(item: AnyRecord) {
      this.setData({
        avatar: (item?.name || "?").slice(0, 1),
        reasonText: Array.isArray(item?.unavailableReasons)
          ? item.unavailableReasons.join("、")
          : ""
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.properties.item);
    }
  }
});
