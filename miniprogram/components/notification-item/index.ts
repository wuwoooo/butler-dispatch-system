import { formatDateTime } from "../../utils/format";

Component({
  properties: {
    item: { type: Object, value: {} }
  },
  data: {
    time: "",
    iconType: "system" // order | leave | review | system
  },
  observers: {
    item(item: AnyRecord) {
      if (!item) return;
      const title = item.title || "";
      let iconType = "system";
      if (title.includes("派单") || title.includes("订单") || title.includes("接单") || title.includes("拒单")) {
        iconType = "order";
      } else if (title.includes("请假") || title.includes("审批") || title.includes("驳回") || title.includes("假")) {
        iconType = "leave";
      } else if (title.includes("评价") || title.includes("评分") || title.includes("星")) {
        iconType = "review";
      }
      this.setData({
        time: formatDateTime(item.createdAt),
        iconType
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.properties.item);
    }
  }
});
