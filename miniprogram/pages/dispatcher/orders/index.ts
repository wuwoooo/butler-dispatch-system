import { getOrders } from "../../../services/order";

const tabs = [
  { key: "pending_dispatch", text: "待分配" },
  { key: "pending_confirm", text: "待接单" },
  { key: "partial_rejected", text: "部分拒单" },
  { key: "confirmed", text: "已确认" },
  { key: "in_service", text: "接待中" },
  { key: "pending_review", text: "待评价" },
  { key: "completed", text: "已完成" }
];

Page({
  data: {
    tabs,
    active: "pending_dispatch",
    keyword: "",
    items: [] as AnyRecord[],
    loading: true
  },
  onLoad(query: AnyRecord) {
    if (query.tab) {
      this.setData({ active: query.tab });
    }
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  setKeyword(event: AnyRecord) {
    this.setData({ keyword: event.detail.value });
  },
  async load() {
    this.setData({ loading: true });
    try {
      const data = await getOrders({
        status: this.data.active,
        guestName: this.data.keyword,
        pageSize: 50
      });
      this.setData({ items: data.items || [] });
    } catch {
      // 接口错误
    } finally {
      this.setData({ loading: false });
    }
  },
  switchTab(event: AnyRecord) {
    this.setData({ active: event.currentTarget.dataset.key });
    this.load();
  },
  openDetail(event: AnyRecord) {
    const detail = event.detail || {};
    wx.navigateTo({ url: `/pages/dispatcher/dispatch-detail/index?orderId=${detail.orderId}` });
  }
});
