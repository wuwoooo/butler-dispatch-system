import { getButlerDetail } from "../../../services/butler";
import { formatDate } from "../../../utils/format";

Page({
  data: {
    id: "",
    butler: {} as AnyRecord,
    avatar: "?",
    rows: [] as AnyRecord[],
    assignments: [] as AnyRecord[]
  },
  onLoad(query: AnyRecord) {
    this.setData({ id: query.id || "" });
    this.load();
  },
  async load() {
    const butler = await getButlerDetail(this.data.id);
    this.setData({
      butler,
      avatar: (butler.name || "?").slice(0, 1),
      rows: [
        ["姓名", butler.name],
        ["手机号", butler.phone],
        ["车型信息", butler.vehicleInfo || "-"],
        ["平均评分", butler.averageScore || "0.00"],
        ["评价次数", butler.reviewCount || 0],
        ["登录账号", butler.user?.username || "-"],
        ["小程序绑定", butler.user?.miniProgramBound ? "已绑定" : "未绑定"]
      ],
      assignments: (butler.activeAssignments || []).map((item: AnyRecord) => ({
        ...item,
        dateText: `${formatDate(item.order?.checkInDate)} 至 ${formatDate(item.order?.checkOutDate)}`
      }))
    });
  }
});
