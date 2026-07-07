const butlerTabs = [
  { key: "home", text: "首页", icon: "icon-home", url: "/pages/butler/home/index" },
  { key: "orders", text: "订单", icon: "icon-orders", url: "/pages/butler/orders/index" },
  { key: "leave", text: "请假", icon: "icon-leave", url: "/pages/butler/leave-records/index" },
  { key: "data", text: "数据", icon: "icon-data", url: "/pages/butler/statistics/index" },
  { key: "profile", text: "我的", icon: "icon-profile", url: "/pages/butler/profile/index" }
];

const dispatcherTabs = [
  { key: "home", text: "首页", icon: "icon-home", url: "/pages/dispatcher/home/index" },
  { key: "orders", text: "订单", icon: "icon-orders", url: "/pages/dispatcher/orders/index" },
  { key: "butlers", text: "管家", icon: "icon-butlers", url: "/pages/dispatcher/butlers/index" },
  { key: "leave", text: "请假", icon: "icon-leave", url: "/pages/dispatcher/leave-review/index" },
  { key: "profile", text: "我的", icon: "icon-profile", url: "/pages/dispatcher/profile/index" }
];

Component({
  properties: {
    role: { type: String, value: "butler" },
    active: { type: String, value: "home" }
  },
  data: {
    tabs: butlerTabs
  },
  observers: {
    role(role: string) {
      this.setData({ tabs: role === "dispatcher" ? dispatcherTabs : butlerTabs });
    }
  },
  lifetimes: {
    attached() {
      this.setData({
        tabs: this.properties.role === "dispatcher" ? dispatcherTabs : butlerTabs
      });
    }
  },
  methods: {
    handleTap(event: AnyRecord) {
      const url = event.currentTarget.dataset.url;
      if (url) {
        wx.redirectTo({ url });
      }
    }
  }
});
