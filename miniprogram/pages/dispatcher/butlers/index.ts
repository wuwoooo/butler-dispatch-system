import { getButlers } from "../../../services/butler";

Page({
  data: {
    keyword: "",
    all: [] as AnyRecord[],
    items: [] as AnyRecord[]
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    const data = await getButlers();
    this.setData({ all: data.items || [] });
    this.filter();
  },
  setKeyword(event: AnyRecord) {
    this.setData({ keyword: event.detail.value });
    this.filter();
  },
  filter() {
    const keyword = this.data.keyword;
    this.setData({
      items: this.data.all.filter((item: AnyRecord) =>
        !keyword || [item.name, item.phone, item.user?.username].some((value) => value?.includes(keyword))
      )
    });
  },
  open(event: AnyRecord) {
    wx.navigateTo({ url: `/pages/dispatcher/butler-detail/index?id=${event.detail.id}` });
  }
});

