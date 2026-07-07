import { z } from "zod";
import { ROLE_CODES } from "@/types/auth";

const optionalTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(max).optional());

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名").max(64, "用户名过长"),
  password: z.string().min(1, "请输入密码").max(128, "密码过长")
});

export const userCreateSchema = z.object({
  username: z.string().min(2, "用户名至少 2 个字符").max(64),
  password: z.string().min(8, "密码至少 8 个字符").max(128),
  name: z.string().min(1, "请输入姓名").max(64),
  phone: z.string().max(32).optional().nullable(),
  roleCode: z.enum(ROLE_CODES),
  status: z.enum(["active", "disabled"]).default("active"),
  hotelId: z.string().optional().nullable(),
  butlerId: z.string().optional().nullable()
});

export const userUpdateSchema = z.object({
  username: z.string().min(2).max(64).optional(),
  password: z.string().min(8).max(128).optional(),
  name: z.string().min(1).max(64).optional(),
  phone: z.string().max(32).optional().nullable(),
  roleCode: z.enum(ROLE_CODES).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  hotelId: z.string().optional().nullable(),
  butlerId: z.string().optional().nullable()
});

export const accountRoleCodes = [
  "admin",
  "dispatcher",
  "hotel_frontdesk",
  "finance"
] as const;

export const accountListRoleCodes = [...accountRoleCodes, "butler"] as const;

const accountProfileSchema = z.object({
  name: z.string().min(1, "请输入姓名").max(64),
  phone: z.string().max(32).optional().nullable(),
  roleCode: z.enum(accountRoleCodes),
  hotelId: z.string().optional().nullable(),
  status: z.enum(["active", "disabled"]).default("active"),
  remark: z.string().max(500).optional().nullable()
});

export const accountCreateSchema = accountProfileSchema
  .extend({
    username: z.string().min(2, "用户名至少 2 个字符").max(64),
    password: z.string().min(8, "密码至少 8 个字符").max(128)
  })
  .superRefine((value, ctx) => {
    if (value.roleCode === "hotel_frontdesk" && !value.hotelId) {
      ctx.addIssue({
        code: "custom",
        path: ["hotelId"],
        message: "酒店前台账号必须绑定酒店"
      });
    }
  });

export const accountUpdateSchema = accountProfileSchema.partial().superRefine((value, ctx) => {
  if (value.roleCode === "hotel_frontdesk" && !value.hotelId) {
    ctx.addIssue({
      code: "custom",
      path: ["hotelId"],
      message: "酒店前台账号必须绑定酒店"
    });
  }
});

export const accountListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  username: z.string().max(64).optional(),
  name: z.string().max(64).optional(),
  phone: z.string().max(32).optional(),
  roleCode: z.enum(accountListRoleCodes).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  hotelId: z.string().optional(),
  miniProgramBound: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "新密码至少 8 个字符").max(128)
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入原密码").max(128, "原密码过长"),
    newPassword: z.string().min(8, "新密码至少 8 个字符").max(128, "新密码过长"),
    confirmPassword: z.string().min(1, "请确认新密码").max(128, "确认密码过长")
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "两次输入的新密码不一致"
      });
    }

    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "新密码不能与原密码相同"
      });
    }
  });

export const butlerAccountCreateSchema = z.object({
  password: z.string().min(8, "密码至少 8 个字符").max(128)
});

export const wechatLoginSchema = z.object({
  code: z.string().min(1, "微信登录凭证不能为空").max(1024)
});

export const miniProgramBindSchema = wechatLoginSchema.extend({
  username: z.string().min(1, "请输入系统账号").max(64),
  password: z.string().min(1, "请输入密码").max(128)
});

export const hotelCreateSchema = z.object({
  code: optionalTrimmedString(64),
  name: z.string().min(1, "请输入酒店名称").max(128),
  address: z.string().max(255).optional().nullable(),
  contactName: z.string().max(64).optional().nullable(),
  contactPhone: z.string().max(32).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  status: z.enum(["active", "disabled"]).default("active")
});

export const hotelUpdateSchema = hotelCreateSchema.partial();

export const hotelRoomTypeCreateSchema = z.object({
  code: optionalTrimmedString(64).nullable(),
  name: z.string().min(1, "请输入房型名称").max(64),
  sort: z.coerce.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  remark: z.string().max(255).optional().nullable()
});

export const hotelRoomTypeUpdateSchema = hotelRoomTypeCreateSchema.partial();

const butlerProfileSchema = z.object({
  code: optionalTrimmedString(64),
  name: z.string().min(1, "请输入管家姓名").max(64),
  phone: z.string().min(1, "请输入手机号").max(32),
  gender: z.string().max(16).optional().nullable(),
  vehicleInfo: z.string().max(128).optional().nullable(),
  dispatchEnabled: z.boolean().optional().default(true),
  remark: z.string().max(500).optional().nullable()
});

export const butlerCreateSchema = butlerProfileSchema.extend({
  accountPassword: z.string().regex(/^\d{6}$/, "初始密码必须是 6 位数字")
});

export const butlerUpdateSchema = butlerProfileSchema.partial();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const orderStatusValues = [
  "pending_dispatch",
  "pending_confirm",
  "partial_rejected",
  "confirmed",
  "in_service",
  "partial_completed",
  "pending_review",
  "reviewed",
  "completed",
  "cancelled",
  "abnormal"
] as const;

export const pickupTypeValues = ["airport", "train"] as const;

const nullableText = (max: number) =>
  z.string().max(max).optional().nullable();

const dateTimeString = (message: string) =>
  z.string().min(1, message).refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message
  });

export const orderListQuerySchema = paginationSchema.extend({
  hotelId: z.string().optional(),
  status: z.enum(orderStatusValues).optional(),
  pickupType: z.enum(pickupTypeValues).optional(),
  checkInStart: z.string().optional(),
  checkInEnd: z.string().optional(),
  arrivalStart: z.string().optional(),
  arrivalEnd: z.string().optional(),
  guestName: z.string().max(64).optional(),
  orderNo: z.string().max(64).optional()
});

const orderBaseSchema = z.object({
  hotelId: z.string().min(1, "请选择酒店"),
  guestName: z.string().min(1, "请输入客人姓名").max(64),
  guestPhone: z.string().min(1, "请输入客人手机号").max(32),
  guestCount: z.coerce.number().int().min(1, "入住人数至少为 1").max(999),
  checkInDate: z.string().datetime("入住日期格式不正确"),
  checkOutDate: z.string().datetime("离店日期格式不正确"),
  roomType: nullableText(64),
  roomNo: nullableText(64),
  pickupType: z.enum(pickupTypeValues),
  arrivalStation: nullableText(128),
  arrivalTime: z.string().datetime("到达时间格式不正确"),
  flightTrainNo: nullableText(64),
  destination: nullableText(128),
  specialNeeds: nullableText(1000),
  remark: nullableText(1000)
});

export const orderCreateSchema = orderBaseSchema.superRefine((value, context) => {
  const checkInDate = new Date(value.checkInDate);
  const checkOutDate = new Date(value.checkOutDate);
  const arrivalTime = new Date(value.arrivalTime);
  const serviceStartAt = new Date(
    Math.min(checkInDate.getTime(), arrivalTime.getTime())
  );

  if (checkOutDate <= serviceStartAt) {
    context.addIssue({
      code: "custom",
      path: ["checkOutDate"],
      message: "离店日期必须晚于到达时间和入住日期"
    });
  }
});

export const orderUpdateSchema = orderBaseSchema.partial().extend({
  status: z.enum(orderStatusValues).optional()
});

export const dispatchAssignSchema = z.object({
  butlerIds: z.array(z.string()).min(1, "请至少选择一名管家"),
  remark: nullableText(500)
});

export const rejectAssignmentSchema = z.object({
  rejectReason: z.string().min(1, "拒单必须填写原因").max(500)
});

export const leaveStatusValues = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "active",
  "finished"
] as const;

export const leaveTypeValues = ["personal", "sick", "rest", "other"] as const;

export const leaveCreateSchema = z
  .object({
    leaveStartTime: dateTimeString("请假开始时间格式不正确"),
    leaveEndTime: dateTimeString("请假结束时间格式不正确"),
    leaveType: z.enum(leaveTypeValues, { message: "请选择请假类型" }),
    reason: z.string().min(1, "请假原因不能为空").max(500)
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.leaveStartTime);
    const end = new Date(value.leaveEndTime);

    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["leaveEndTime"],
        message: "请假结束时间必须晚于开始时间"
      });
    }

    if (end <= new Date()) {
      ctx.addIssue({
        code: "custom",
        path: ["leaveEndTime"],
        message: "不能提交已经完全过去的请假"
      });
    }
  });

export const butlerLeaveQuerySchema = paginationSchema.extend({
  status: z.enum(leaveStatusValues).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
});

export const leaveListQuerySchema = paginationSchema.extend({
  butlerName: z.string().max(64).optional(),
  butlerPhone: z.string().max(32).optional(),
  status: z.enum(leaveStatusValues).optional(),
  leaveType: z.enum(leaveTypeValues).optional(),
  leaveStartTime: z.string().optional(),
  leaveEndTime: z.string().optional(),
  createdStartTime: z.string().optional(),
  createdEndTime: z.string().optional()
});

export const leaveRejectSchema = z.object({
  rejectReason: z.string().min(1, "驳回原因不能为空").max(500)
});

const scoreSchema = z.coerce.number().int().min(1).max(5);

export const reviewCreateSchema = z.object({
  orderId: z.string().min(1, "订单不能为空"),
  butlerId: z.string().min(1, "管家不能为空"),
  overallScore: scoreSchema,
  attitudeScore: scoreSchema,
  punctualityScore: scoreSchema,
  communicationScore: scoreSchema,
  tags: z.array(z.string().min(1).max(32)).max(20).optional().default([]),
  content: z.string().max(1000).optional().nullable(),
  complaintFlag: z.boolean().optional().default(false)
});

export const reviewListQuerySchema = paginationSchema.extend({
  orderId: z.string().optional(),
  butlerId: z.string().optional(),
  hotelId: z.string().optional(),
  reviewerRole: z.enum(ROLE_CODES).optional(),
  scoreMin: z.coerce.number().int().min(1).max(5).optional(),
  scoreMax: z.coerce.number().int().min(1).max(5).optional(),
  complaintFlag: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value ? value === "true" : undefined)),
  startTime: z.string().optional(),
  endTime: z.string().optional()
});

export const statisticsQuerySchema = z
  .object({
    range: z.enum(["today", "week", "month", "year", "all", "custom"]).optional().default("month"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    butlerId: z.string().optional(),
    hotelId: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom" && (!value.startTime || !value.endTime)) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "自定义统计范围需要开始和结束时间"
      });
    }
  });

export const butlerOrderRecordsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hotelId: z.string().optional()
});

export const settlementStatusValues = ["unsettled", "settled"] as const;

export const financeOrdersQuerySchema = paginationSchema.extend({
  hotelId: z.string().optional(),
  orderStatus: z.enum(orderStatusValues).optional(),
  pickupType: z.enum(pickupTypeValues).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  arrivalStartTime: z.string().optional(),
  arrivalEndTime: z.string().optional(),
  settlementStatus: z.enum(settlementStatusValues).optional(),
  keyword: z.string().max(64).optional()
});

export const financeButlerServicesQuerySchema = paginationSchema.extend({
  butlerId: z.string().optional(),
  hotelId: z.string().optional(),
  assignmentStatus: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pickupType: z.enum(pickupTypeValues).optional()
});

export const financeHotelStatisticsQuerySchema = paginationSchema.extend({
  hotelId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pickupType: z.enum(pickupTypeValues).optional()
});

export const settlementUpdateSchema = z.object({
  settlementStatus: z.enum(settlementStatusValues),
  settlementRemark: z.string().max(500).optional().nullable()
});

export const dashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hotelId: z.string().optional()
});

export const notificationListQuerySchema = paginationSchema.extend({
  readStatus: z.enum(["read", "unread"]).optional(),
  notificationType: z.string().max(64).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const logsQuerySchema = paginationSchema.extend({
  operatorId: z.string().optional(),
  operatorRole: z.enum(ROLE_CODES).optional(),
  operationType: z.string().max(64).optional(),
  targetType: z.string().max(64).optional(),
  targetId: z.string().max(128).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  keyword: z.string().max(64).optional()
});

export const systemDictQuerySchema = paginationSchema.extend({
  dictType: z.string().max(64).optional(),
  keyword: z.string().max(64).optional(),
  scope: z.enum(["business", "notification"]).optional(),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value ? value === "true" : undefined))
});

export const systemDictCreateSchema = z.object({
  dictType: z.string().min(1, "字典类型不能为空").max(64),
  dictLabel: z.string().min(1, "字典名称不能为空").max(64),
  dictValue: optionalTrimmedString(64),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.boolean().default(true),
  remark: z.string().max(255).optional().nullable()
});

export const systemDictUpdateSchema = systemDictCreateSchema.partial();

export const abnormalStatusValues = [
  "pending",
  "processing",
  "resolved",
  "ignored"
] as const;

export const abnormalListQuerySchema = paginationSchema.extend({
  orderId: z.string().optional(),
  butlerId: z.string().optional(),
  abnormalType: z.string().max(64).optional(),
  status: z.enum(abnormalStatusValues).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  keyword: z.string().max(64).optional()
});

export const abnormalCreateSchema = z.object({
  orderId: z.string().optional().nullable(),
  butlerId: z.string().optional().nullable(),
  abnormalType: z.string().min(1, "异常类型不能为空").max(64),
  description: z.string().min(1, "异常描述不能为空").max(1000)
});

export const abnormalUpdateSchema = z.object({
  abnormalType: z.string().min(1).max(64).optional(),
  description: z.string().min(1).max(1000).optional(),
  status: z.enum(abnormalStatusValues).optional(),
  handleResult: z.string().max(1000).optional().nullable()
});

export const abnormalResolveSchema = z.object({
  status: z.enum(["resolved", "ignored"]),
  handleResult: z.string().min(1, "处理结果不能为空").max(1000)
});

export const rejectionListQuerySchema = paginationSchema.extend({
  orderId: z.string().optional(),
  butlerId: z.string().optional(),
  hotelId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});
