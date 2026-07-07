"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMap = exports.leaveTypeMap = exports.pickupTypeMap = exports.leaveStatusMap = exports.butlerStatusMap = exports.assignmentStatusMap = exports.orderStatusMap = void 0;
exports.getStatus = getStatus;
exports.orderStatusMap = {
    pending_dispatch: { text: "待分配", tone: "info" },
    pending_confirm: { text: "待接单", tone: "warning" },
    partial_rejected: { text: "部分拒单", tone: "danger" },
    confirmed: { text: "已确认", tone: "cyan" },
    in_service: { text: "接待中", tone: "success" },
    partial_completed: { text: "部分离店", tone: "warning" },
    pending_review: { text: "待评价", tone: "purple" },
    reviewed: { text: "已评价", tone: "gray" },
    completed: { text: "已完成", tone: "gray" },
    cancelled: { text: "已取消", tone: "gray" },
    abnormal: { text: "异常", tone: "danger" }
};
exports.assignmentStatusMap = {
    pending_confirm: { text: "待接单", tone: "warning" },
    confirmed: { text: "准备接待", tone: "cyan" },
    rejected: { text: "已拒单", tone: "danger" },
    picked_guest: { text: "接待中", tone: "success" },
    in_service: { text: "接待中", tone: "success" },
    completed: { text: "已完成", tone: "gray" },
    abnormal: { text: "异常", tone: "danger" },
    reassigned: { text: "已改派", tone: "gray" },
    cancelled: { text: "已取消", tone: "gray" }
};
exports.butlerStatusMap = {
    available: { text: "空闲", tone: "success" },
    pending_confirm: { text: "待接单", tone: "warning" },
    confirmed_waiting: { text: "准备接待", tone: "cyan" },
    in_service: { text: "接待中", tone: "success" },
    on_leave: { text: "请假中", tone: "warning" },
    suspended: { text: "暂停接单", tone: "gray" },
    disabled: { text: "停用", tone: "gray" }
};
exports.leaveStatusMap = {
    pending: { text: "待审核", tone: "warning" },
    approved: { text: "已通过", tone: "cyan" },
    rejected: { text: "已驳回", tone: "danger" },
    cancelled: { text: "已撤销", tone: "gray" },
    active: { text: "请假中", tone: "warning" },
    finished: { text: "已结束", tone: "gray" }
};
exports.pickupTypeMap = {
    airport: "接飞机",
    train: "接火车"
};
exports.leaveTypeMap = {
    personal: "事假",
    sick: "病假",
    rest: "休息",
    other: "其他"
};
exports.roleMap = {
    admin: "管理员",
    dispatcher: "调配员",
    hotel_frontdesk: "酒店前台",
    butler: "管家",
    finance: "财务人员"
};
function getStatus(type, value) {
    var _a, _b;
    if (!value) {
        return { text: "-", tone: "gray" };
    }
    const maps = {
        order: exports.orderStatusMap,
        assignment: exports.assignmentStatusMap,
        butler: exports.butlerStatusMap,
        leave: exports.leaveStatusMap
    };
    return (_b = (_a = maps[type]) === null || _a === void 0 ? void 0 : _a[value]) !== null && _b !== void 0 ? _b : { text: "未知状态", tone: "gray" };
}
