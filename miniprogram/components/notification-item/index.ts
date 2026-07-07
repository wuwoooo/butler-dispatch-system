import { formatDateTime } from "../../utils/format";

Component({
  properties: {
    item: { type: Object, value: {} }
  },
  data: {
    time: ""
  },
  observers: {
    item(item: AnyRecord) {
      this.setData({ time: formatDateTime(item.createdAt) });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.properties.item);
    }
  }
});

