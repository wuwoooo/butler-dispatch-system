import {
  getButlerOrderRecords,
  getButlerReviews,
  getButlerStatistics
} from "../../../services/butler";
import { getStatus } from "../../../utils/status-map";

const rangeTabs = [
  { key: "month", text: "本月" },
  { key: "year", text: "本年" },
  { key: "all", text: "所有" }
];

Page({
  data: {
    rangeTabs,
    range: "month",
    stats: {} as AnyRecord,
    records: [] as AnyRecord[],
    reviews: [] as AnyRecord[]
  },
  onShow() {
    this.load();
  },
  async load() {
    const rangeParams = buildRangeParams(this.data.range);
    const [stats, records, reviews] = await Promise.all([
      getButlerStatistics({ range: this.data.range }),
      getButlerOrderRecords({ pageSize: 5, ...rangeParams }),
      getButlerReviews(rangeParams)
    ]);
    this.setData({
      stats,
      records: (records.items || []).map((item: AnyRecord) => ({
        ...item,
        statusText: item.completed ? "已完成" : getStatus("assignment", item.status).text
      })),
      reviews: (reviews.items || []).slice(0, 3).map((item: AnyRecord) => ({
        ...item,
        orderId: item.orderId || item.order?.id
      }))
    });
  },
  switchRange(event: AnyRecord) {
    this.setData({ range: event.currentTarget.dataset.key });
    this.load();
  },
  openStat(event: AnyRecord) {
    const { url, action } = event.detail || {};
    if (url) {
      wx.navigateTo({ url });
      return;
    }

    if (action === "records") {
      wx.pageScrollTo({ selector: "#records-anchor", duration: 260 });
      return;
    }

    if (action === "reviews") {
      wx.pageScrollTo({ selector: "#reviews-anchor", duration: 260 });
    }
  },
  openOrder(event: AnyRecord) {
    const { orderId, assignmentId } = event.currentTarget.dataset;
    if (!orderId) return;
    const query = assignmentId ? `&assignmentId=${assignmentId}` : "";
    wx.navigateTo({ url: `/pages/butler/order-detail/index?orderId=${orderId}${query}` });
  }
});

function buildRangeParams(range: string) {
  if (range === "all") {
    return {};
  }

  const now = new Date();
  const start =
    range === "year"
      ? new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString()
  };
}
