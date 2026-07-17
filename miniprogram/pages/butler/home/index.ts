import { getButlerDashboard } from "../../../services/statistics";
import { completeOrder, pickedGuest } from "../../../services/order";
import { formatDateTimeFull } from "../../../utils/format";
import { getStatus } from "../../../utils/status-map";

const REFRESH_INTERVAL_MS = 30000;

const encouragements = [
  "把人放在心上，细节就会有温度。",
  "好的服务不是热闹，是让人心里安定。",
  "你把复杂留给自己，把从容交给客人。",
  "稳定抵达，本身就是一种温柔的照顾。",
  "愿你今天从容一点，也被这个世界温柔相待。",
  "被认真对待的旅程，会在记忆里停留很久。",
  "专业不是冷冰冰的标准，是让人真正放心。",
  "你守住的小事，常常是客人记住的安心。",
  "温和不是退让，是把事情稳稳接住的力量。",
  "路程会结束，被好好照顾过的感觉会留下。",
  "把平凡的一天照料好，就是很了不起的事。",
  "愿你在忙碌里，也给自己留一口慢慢呼吸。",
  "真正可靠的人，不急着证明，却总让人放心。",
  "每一次耐心确认，都是对旅途的认真守护。",
  "你认真完成的细节，会替你积累长久的信任。",
  "好客不是一句话，是一次次稳妥的抵达。",
  "愿今天的风景，也给认真赶路的你留一份好心情。",
  "最好的接待，是让一切发生得刚刚好。",
  "你给出的安心，会成为客人旅途中柔软的一页。",
  "照顾好客人，也请把自己放进今天的照顾里。",
  "真正动人的专业，是忙而不乱，也心里有人。",
  "让人放心，比让人惊艳更难，也更珍贵。",
  "你走过的路，会变成客人少走的弯路。",
  "有人记得风景，也会有人记得你的周到。",
  "把事情做稳的人，自带让人安心的光。",
  "最有力量的体面，是辛苦过后依然温和。",
  "你不是在赶一单任务，是在接住一段旅程。",
  "好的安排，像灯一样，让陌生的路不慌。",
  "你把每个小问题处理好，旅途就多一分顺。",
  "被信任不是运气，是一次次靠谱攒出来的。",
  "今天的准时，是客人心里第一句放心。",
  "真正的好服务，是让客人不用反复担心。",
  "你认真对待的一分钟，也许温暖别人一整天。",
  "请相信，细致的人总会被时间温柔记住。",
  "最好的专业感，是让人觉得一切都被照看着。",
  "你不必声张，稳妥本身就会被看见。",
  "每一次多问一句，都是把风险挡在前面。",
  "你给出的确定感，是旅途中很贵重的礼物。",
  "温柔有时很具体，是准时、确认和回应。",
  "把客人的慌张接过去，是很了不起的能力。",
  "愿你今天遇见顺路的风，也遇见懂你的人。",
  "山水会留住目光，周到会留住人心。",
  "你把陌生的地方，变成别人可以安心停靠的地方。",
  "真正的好口碑，藏在客人没说出口的安心里。",
  "你认真交付的不是流程，是一段被照顾的时间。",
  "忙的时候更要稳，因为稳就是你的底气。",
  "愿你今天的每一次出发，都有清亮的心情。",
  "把难处处理得轻一点，是专业，也是善意。",
  "有人负责风景，你负责让旅途不慌。",
  "你让行程有秩序，也让人心有着落。",
  "靠谱的人不怕慢一点，怕的是不够踏实。",
  "每个被妥善回应的问题，都会变成信任。",
  "你给客人的不是答案而已，还有被重视的感觉。",
  "真正的周到，是在客人开口前多想一步。",
  "今天也请记得，你的状态也值得被照顾。",
  "你把普通日子做得可靠，日子就有了光。",
  "好服务会经过手，也会抵达人心。",
  "你稳住了现场，也稳住了客人的心情。",
  "旅途有很多未知，你就是其中确定的一部分。",
  "被需要时能出现，本身就是一种温暖。",
  "你的耐心不是消耗，是把混乱变清楚的能力。",
  "让人安心的人，走到哪里都有分量。",
  "真正好的接待，是让客人离开时还记得舒服。",
  "你认真说出的每句确认，都是旅途的安全感。",
  "不用把自己燃尽，也能把事情照亮。",
  "愿你今天忙得有章法，也累得被看见。",
  "做服务的人最懂：小事做好，就是大事。",
  "你把细节铺平，客人才走得轻松。",
  "一段旅程的温度，常常来自一个靠谱的人。",
  "愿你心里有光，手上有准，脚下有风。",
  "真正的从容，是心里有数，眼里有人。",
  "你认真守住的标准，会变成别人放心的理由。",
  "好客的意义，是让远方来的人不觉得孤单。",
  "你让每一次抵达，都多了一点被欢迎的感觉。",
  "愿你的善意不被忙碌磨钝，愿你的专业一直发光。",
  "能把琐碎做出温度的人，最值得被感谢。",
  "你照顾的是行程，也是别人期待已久的一天。",
  "真正打动人的服务，是让人觉得自己被放在心上。",
  "别急着否定辛苦，能坚持温和已经很不容易。",
  "你今天做好的每件小事，都在替明天铺路。",
  "让客人放心地看风景，是你很重要的价值。"
];

Page({
  refreshTimer: null as ReturnType<typeof setInterval> | null,
  overduePromptedAssignmentIds: new Set<string>(),
  overduePrompting: false,
  occurredAtPickerResolver: null as ((occurredAt: string | null) => void) | null,
  data: {
    todayDate: "",
    encouragement: "",
    greetText: "你好",
    user: {},
    butler: {},
    butlerStatusText: "空闲",
    cards: {},
    currentTask: null as AnyRecord | null,
    currentTasks: [] as AnyRecord[],
    occurredAtPicker: { visible: false, title: "" },
    refreshing: false,
    shortcuts: [
      { title: "我的订单", desc: "查看接待任务", url: "/pages/butler/orders/index", tone: "blue" },
      { title: "请假申请", desc: "提交休假安排", url: "/pages/butler/leave-apply/index", tone: "orange" },
      { title: "请假记录", desc: "审核状态追踪", url: "/pages/butler/leave-records/index", tone: "green" },
      { title: "我的数据", desc: "服务表现统计", url: "/pages/butler/statistics/index", tone: "cyan" },
      { title: "消息通知", desc: "查看系统消息", url: "/pages/butler/notifications/index", tone: "purple" },
      { title: "个人中心", desc: "账号与绑定", url: "/pages/butler/profile/index", tone: "blue" }
    ]
  },
  onShow() {
    this.load();
    this.startAutoRefresh();
  },
  onHide() {
    this.stopAutoRefresh();
  },
  onUnload() {
    this.stopAutoRefresh();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  startAutoRefresh() {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      this.load(true);
    }, REFRESH_INTERVAL_MS);
  },
  stopAutoRefresh() {
    if (!this.refreshTimer) return;
    clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  },
  handleRefresh() {
    this.load();
  },
  async load(silent = false) {
    if (this.data.refreshing) return;
    this.setData({ refreshing: true });
    try {
      const data = await getButlerDashboard();
      
      const now = new Date();
      const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
      const dateText = `${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;
      const index = Math.floor(Math.random() * encouragements.length);
      const encouragement = encouragements[index];

      const hours = now.getHours();
      let greet = "你好";
      if (hours >= 5 && hours < 9) greet = "早上好";
      else if (hours >= 9 && hours < 12) greet = "上午好";
      else if (hours >= 12 && hours < 14) greet = "中午好";
      else if (hours >= 14 && hours < 18) greet = "下午好";
      else greet = "晚上好";

      this.setData({
        todayDate: dateText,
        encouragement: encouragement,
        greetText: greet,
        user: wx.getStorageSync("user") || {},
        butler: data.butler || {},
        butlerStatusText: getStatus("butler", data.butler?.status || "available").text,
        cards: data.cards || {},
        currentTask: data.currentTask || null,
        currentTasks: data.currentTasks || (data.currentTask ? [data.currentTask] : [])
      });
      if (!silent) {
        await this.promptOverdueTask(data.currentTasks || (data.currentTask ? [data.currentTask] : []));
      }
    } catch {
      if (!silent) {
        wx.showToast({ title: "刷新失败，请稍后重试", icon: "none" });
      }
    } finally {
      this.setData({ refreshing: false });
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
  },
  async promptOverdueTask(tasks: AnyRecord[]) {
    if (this.overduePrompting) return;
    const task = findOverdueTask(tasks, this.overduePromptedAssignmentIds);
    if (!task) return;

    this.overduePrompting = true;
    this.overduePromptedAssignmentIds.add(task.id);
    const isPickup = task.status === "confirmed";
    const expectedAt = isPickup
      ? task.order?.serviceStartAt || task.order?.arrivalTime
      : task.order?.serviceEndAt || getCheckOutDueAt(task.order?.checkOutDate);
    const isTransport = task.order?.serviceMode === "transport";
    wx.showModal({
      title: isPickup ? "确认是否已接到客人" : "确认是否已完成接待",
      content: `订单 ${task.order?.orderNo || ""} 的${isTransport ? "服务" : "客人"}预计${isPickup ? "开始" : isTransport ? "结束" : "离店"}时间为 ${formatDateTimeFull(expectedAt)}，是否${isPickup ? "已接到客人" : isTransport ? "已完成接送服务" : "已离店并完成接待"}？`,
      confirmText: "去确认",
      cancelText: "稍后处理",
      confirmColor: "#2AACE2",
      success: async (res: AnyRecord) => {
        if (res.confirm) {
          const occurredAt = await this.chooseOccurredAt(isPickup ? "选择接到时间" : "选择完成时间");
          if (occurredAt) {
            await (isPickup ? pickedGuest(task.id, occurredAt) : completeOrder(task.id, occurredAt));
            wx.showToast({ title: "操作成功", icon: "success" });
            await this.load(true);
          }
        }
      },
      complete: () => {
        this.overduePrompting = false;
      },
      fail: () => {
        this.overduePromptedAssignmentIds.delete(task.id);
        wx.showToast({ title: "提醒弹窗打开失败，请重试", icon: "none" });
      }
    });
  },
  chooseOccurredAt(title: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.occurredAtPickerResolver = resolve;
      this.setData({ occurredAtPicker: { visible: true, title } });
    });
  },
  handleOccurredAtConfirm(event: AnyRecord) {
    const resolve = this.occurredAtPickerResolver;
    this.occurredAtPickerResolver = null;
    this.setData({ occurredAtPicker: { visible: false, title: "" } });
    resolve?.(event.detail?.occurredAt || null);
  },
  handleOccurredAtCancel() {
    const resolve = this.occurredAtPickerResolver;
    this.occurredAtPickerResolver = null;
    this.setData({ occurredAtPicker: { visible: false, title: "" } });
    resolve?.(null);
  }
});

function findOverdueTask(tasks: AnyRecord[], promptedIds: Set<string>) {
  const now = Date.now();
  return tasks.find((task) => {
    if (!task?.id || promptedIds.has(task.id)) return false;
    if (task.order?.stayExtensions?.length) return false;
    if (task.status === "confirmed") {
      return isAtOrBeforeNow(task.order?.serviceStartAt || task.order?.arrivalTime, now);
    }
    if (["picked_guest", "in_service"].includes(task.status)) {
      return isAtOrBeforeNow(task.order?.serviceEndAt || getCheckOutDueAt(task.order?.checkOutDate), now);
    }
    return false;
  });
}

function isAtOrBeforeNow(value: string | Date | null | undefined, now: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time <= now;
}

function getCheckOutDueAt(value: string | Date | null | undefined) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}
