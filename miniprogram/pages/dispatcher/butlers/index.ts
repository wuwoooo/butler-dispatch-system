import { getButlers } from "../../../services/butler";

const statusTabs = [
  { key: "all", text: "全部" },
  { key: "available", text: "空闲" },
  { key: "working", text: "接待中" },
  { key: "on_leave", text: "请假" }
];

Page({
  data: {
    statusTabs,
    activeStatus: "all",
    keyword: "",
    all: [] as AnyRecord[],
    items: [] as AnyRecord[],
    loading: true
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true });
    try {
      const data = await getButlers();
      this.setData({ all: data.items || [] });
      this.filter();
    } catch {
      // 接口自动提示
    } finally {
      this.setData({ loading: false });
    }
  },
  setKeyword(event: AnyRecord) {
    this.setData({ keyword: event.detail.value });
    this.filter();
  },
  switchStatus(event: AnyRecord) {
    this.setData({ activeStatus: event.currentTarget.dataset.key });
    this.filter();
  },
  filter() {
    const keyword = this.data.keyword;
    const activeStatus = this.data.activeStatus;
    
    this.setData({
      items: this.data.all.filter((item: AnyRecord) => {
        const matchesKeyword = !keyword || [item.name, item.phone, item.user?.username].some((value) => value?.includes(keyword));
        const matchesStatus = activeStatus === "all" || item.status === activeStatus;
        return matchesKeyword && matchesStatus;
      })
    });
  },
  open(event: AnyRecord) {
    wx.navigateTo({ url: `/pages/dispatcher/butler-detail/index?id=${event.detail.id}` });
  }
});
