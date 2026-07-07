"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveTypes = exports.rejectReasons = void 0;
exports.rejectReasons = ["时间冲突", "身体原因", "临时有事", "其他"];
exports.leaveTypes = [
    { label: "事假", value: "personal" },
    { label: "病假", value: "sick" },
    { label: "休息", value: "rest" },
    { label: "其他", value: "other" }
];
