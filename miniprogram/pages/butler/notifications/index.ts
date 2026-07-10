import {
  getNotifications,
  readAllNotifications,
  readNotification
} from "../../../services/notification";
import { resolveNotificationUrl } from "../../../utils/notification-navigation";

Page({
  data: {
    items: [] as AnyRecord[]
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    const data = await getNotifications();
    this.setData({ items: data.items || [] });
  },
  async open(event: AnyRecord) {
    const item = event.detail;
    await readNotification(item.id);
    const url = resolveNotificationUrl(item, "butler");
    if (url) {
      wx.navigateTo({ url });
      return;
    }

    this.load();
  },
  lastReadAllTime: 0,
  readAll() {
    const now = Date.now();
    if (now - this.lastReadAllTime < 1000) return;
    this.lastReadAllTime = now;

    wx.showModal({
      title: "全部已读",
      content: "确认将所有通知标记为已读？",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await readAllNotifications();
        this.load();
      }
    });
  }
});
