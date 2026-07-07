import { getButlerDashboard } from "../../../services/statistics";
import { getStatus } from "../../../utils/status-map";

const encouragements = [
  "您今天辛苦了，每一份付出都值得被看见。",
  "愿今天的每一次接待，都成为客人旅途里的安心时刻。",
  "把细节做好的人，值得被认真感谢。",
  "今天也请照顾好自己，好的服务从从容开始。",
  "您的专业和耐心，会让每段旅程更温暖。",
  "认真服务的人自带光芒，今天也请相信自己的价值。",
  "您多走的一步，常常就是客人记住这趟旅程的原因。",
  "稳定、细致、可靠，这些品质会在时间里被看见。",
  "今天的每一次准时抵达，都是一种让人安心的承诺。",
  "您的温和和周到，会让陌生的旅途多一份踏实。",
  "别忘了给自己一点肯定，您已经做得很好。",
  "服务不是简单完成任务，而是把安心交到客人手里。",
  "您认真对待的每个细节，都在悄悄积累口碑。",
  "今天也请带着从容出发，好的状态会传递给客人。",
  "辛苦的路不会白走，可靠的人总会被信任。",
  "您守住的是服务标准，也是客人对这座城市的第一印象。",
  "忙碌时也请记得喝水休息，您的状态同样重要。",
  "每一次耐心回应，都是专业的一部分。",
  "愿您今天一路顺利，遇到的客人都带着善意和笑容。",
  "您让行程变得有秩序，也让客人心里更有底。",
  "真正好的服务，藏在一次次稳稳妥妥的安排里。",
  "今天的认真，会成为明天被选择的理由。",
  "您不是只在完成接待，也是在创造被记住的体验。",
  "请相信，靠谱本身就是很珍贵的能力。"
];

Page({
  data: {
    today: buildTodayMessage(),
    user: {},
    butler: {},
    butlerStatusText: "空闲",
    cards: {},
    currentTask: null as AnyRecord | null,
    shortcuts: [
      { title: "我的订单", desc: "查看接待任务", url: "/pages/butler/orders/index" },
      { title: "请假申请", desc: "提交休假安排", url: "/pages/butler/leave-apply/index" },
      { title: "请假记录", desc: "审核状态追踪", url: "/pages/butler/leave-records/index" },
      { title: "我的数据", desc: "服务表现统计", url: "/pages/butler/statistics/index" },
      { title: "消息通知", desc: "查看系统消息", url: "/pages/butler/notifications/index" },
      { title: "个人中心", desc: "账号与绑定", url: "/pages/butler/profile/index" }
    ]
  },
  onShow() {
    this.load();
  },
  async load() {
    try {
      const data = await getButlerDashboard();
      this.setData({
        user: wx.getStorageSync("user") || {},
        butler: data.butler || {},
        butlerStatusText: getStatus("butler", data.butler?.status || "available").text,
        cards: data.cards || {},
        currentTask: data.currentTask || null
      });
    } catch {
      // request 层已提示错误。
    }
  },
  openShortcut(event: AnyRecord) {
    const url = event.detail?.url || event.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({ url });
    }
  },
  openTask(event: AnyRecord) {
    const detail = event.detail || {};
    wx.navigateTo({
      url: `/pages/butler/order-detail/index?orderId=${detail.orderId}&assignmentId=${detail.assignmentId}`
    });
  }
});

function buildTodayMessage() {
  const now = new Date();
  const text = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;
  const index = Math.floor(Math.random() * encouragements.length);
  return `今天是${text}，${encouragements[index]}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
