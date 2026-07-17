import { PrismaClient, RoleCode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = await seedRoles();
  const hotels = await seedHotels();
  await seedHotelRoomTypes(hotels);
  const butlers = await seedButlers();
  const users = await seedUsers(roles, hotels, butlers);

  await seedSystemDicts();
  await seedOrders(hotels, butlers, users);

  console.log("Seed completed.");
}

async function seedRoles() {
  const roleRows = [
    {
      code: RoleCode.admin,
      name: "管理员",
      description: "管理所有数据和系统配置"
    },
    {
      code: RoleCode.hotel_frontdesk,
      name: "酒店前台",
      description: "管理所属酒店订单"
    },
    {
      code: RoleCode.dispatcher,
      name: "调配员",
      description: "查看订单、派单和审核请假"
    },
    {
      code: RoleCode.butler,
      name: "管家",
      description: "小程序接单、服务和请假"
    },
    {
      code: RoleCode.finance,
      name: "财务人员",
      description: "查看统计和导出财务数据"
    }
  ];

  const entries = await Promise.all(
    roleRows.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description
        },
        create: role
      })
    )
  );

  return Object.fromEntries(entries.map((role) => [role.code, role]));
}

async function seedHotels() {
  return Promise.all([
    prisma.hotel.upsert({
      where: { code: "HOTEL_DALI_001" },
      update: {
        name: "大理云境度假酒店",
        address: "大理市古城片区示例路 1 号",
        contactName: "李经理",
        contactPhone: "13800010001",
        phone: "0872-6600001",
        status: "active"
      },
      create: {
        code: "HOTEL_DALI_001",
        name: "大理云境度假酒店",
        address: "大理市古城片区示例路 1 号",
        contactName: "李经理",
        contactPhone: "13800010001",
        phone: "0872-6600001"
      }
    }),
    prisma.hotel.upsert({
      where: { code: "HOTEL_DALI_002" },
      update: {
        name: "洱海山居酒店",
        address: "大理市洱海片区示例路 2 号",
        contactName: "周经理",
        contactPhone: "13800010002",
        phone: "0872-6600002",
        status: "active"
      },
      create: {
        code: "HOTEL_DALI_002",
        name: "洱海山居酒店",
        address: "大理市洱海片区示例路 2 号",
        contactName: "周经理",
        contactPhone: "13800010002",
        phone: "0872-6600002"
      }
    })
  ]);
}

async function seedHotelRoomTypes(
  hotels: Awaited<ReturnType<typeof seedHotels>>
) {
  const roomTypeRows = [
    {
      hotelId: hotels[0].id,
      code: "SEA_KING",
      name: "海景大床房",
      sort: 1,
      enabled: true,
      remark: "主力房型"
    },
    {
      hotelId: hotels[0].id,
      code: "COURTYARD_SUITE",
      name: "庭院套房",
      sort: 2,
      enabled: true,
      remark: "适合家庭客"
    },
    {
      hotelId: hotels[0].id,
      code: "TERRACE_KING",
      name: "露台大床房",
      sort: 3,
      enabled: true,
      remark: null
    },
    {
      hotelId: hotels[1].id,
      code: "FAMILY_SUITE",
      name: "亲子套房",
      sort: 1,
      enabled: true,
      remark: "高频亲子订单"
    },
    {
      hotelId: hotels[1].id,
      code: "LAKE_TWIN",
      name: "湖景双床房",
      sort: 2,
      enabled: true,
      remark: null
    },
    {
      hotelId: hotels[1].id,
      code: "LAKE_SUITE",
      name: "湖景套房",
      sort: 3,
      enabled: true,
      remark: null
    }
  ];

  await Promise.all(
    roomTypeRows.map((row) =>
      prisma.hotelRoomType.upsert({
        where: {
          hotelId_name: {
            hotelId: row.hotelId,
            name: row.name
          }
        },
        update: {
          code: row.code,
          sort: row.sort,
          enabled: row.enabled,
          remark: row.remark
        },
        create: row
      })
    )
  );
}

async function seedButlers() {
  const rows = [
    {
      code: "BUTLER_001",
      name: "赵一",
      phone: "13900020001",
      gender: "male",
      vehicleType: "business" as const,
      vehicleInfo: "别克 GL8（7座）"
    },
    {
      code: "BUTLER_002",
      name: "钱二",
      phone: "13900020002",
      gender: "female",
      vehicleType: "business" as const,
      vehicleInfo: "丰田赛那（7座）"
    },
    {
      code: "BUTLER_003",
      name: "孙三",
      phone: "13900020003",
      gender: "male",
      vehicleType: "sedan" as const,
      vehicleInfo: "大众迈腾（5座）"
    },
    {
      code: "BUTLER_004",
      name: "李四",
      phone: "13900020004",
      gender: "female",
      vehicleType: "business" as const,
      vehicleInfo: "传祺 M8（7座）"
    },
    {
      code: "BUTLER_005",
      name: "王五",
      phone: "13900020005",
      gender: "male",
      vehicleType: "business" as const,
      vehicleInfo: "本田奥德赛（7座）"
    }
  ];

  return Promise.all(
    rows.map((row) =>
      prisma.butler.upsert({
        where: { code: row.code },
        update: {
          name: row.name,
          phone: row.phone,
          gender: row.gender,
          vehicleType: row.vehicleType,
          vehicleInfo: row.vehicleInfo,
          status: "available"
        },
        create: {
          ...row,
          status: "available"
        }
      })
    )
  );
}

async function seedUsers(
  roles: Awaited<ReturnType<typeof seedRoles>>,
  hotels: Awaited<ReturnType<typeof seedHotels>>,
  butlers: Awaited<ReturnType<typeof seedButlers>>
) {
  const users = await Promise.all([
    upsertUser({
      username: "admin",
      password: "admin123456",
      name: "系统管理员",
      phone: "13800000001",
      roleCode: RoleCode.admin,
      roleId: roles.admin.id
    }),
    upsertUser({
      username: "dispatcher",
      password: "dispatcher123456",
      name: "调配员",
      phone: "13800000002",
      roleCode: RoleCode.dispatcher,
      roleId: roles.dispatcher.id
    }),
    upsertUser({
      username: "frontdesk",
      password: "frontdesk123456",
      name: "酒店前台",
      phone: "13800000003",
      roleCode: RoleCode.hotel_frontdesk,
      roleId: roles.hotel_frontdesk.id,
      hotelId: hotels[0].id
    }),
    upsertUser({
      username: "frontdesk02",
      password: "frontdesk123456",
      name: "酒店前台二",
      phone: "13800000006",
      roleCode: RoleCode.hotel_frontdesk,
      roleId: roles.hotel_frontdesk.id,
      hotelId: hotels[1].id
    }),
    upsertButlerUser({
      username: "zhaoyi",
      password: "butler123456",
      name: "管家赵一",
      phone: "13800000004",
      roleCode: RoleCode.butler,
      roleId: roles.butler.id,
      butlerId: butlers[0].id
    }),
    upsertButlerUser({
      username: "qianer",
      password: "butler123456",
      name: "管家钱二",
      phone: "13800000007",
      roleCode: RoleCode.butler,
      roleId: roles.butler.id,
      butlerId: butlers[1].id
    }),
    upsertButlerUser({
      username: "sunsan",
      password: "butler123456",
      name: "管家孙三",
      phone: "13800000008",
      roleCode: RoleCode.butler,
      roleId: roles.butler.id,
      butlerId: butlers[2].id
    }),
    upsertButlerUser({
      username: "lisi",
      password: "butler123456",
      name: "管家李四",
      phone: "13800000010",
      roleCode: RoleCode.butler,
      roleId: roles.butler.id,
      butlerId: butlers[3].id
    }),
    upsertButlerUser({
      username: "wangwu",
      password: "butler123456",
      name: "管家王五",
      phone: "13800000011",
      roleCode: RoleCode.butler,
      roleId: roles.butler.id,
      butlerId: butlers[4].id
    }),
    upsertUser({
      username: "finance",
      password: "finance123456",
      name: "财务人员",
      phone: "13800000005",
      roleCode: RoleCode.finance,
      roleId: roles.finance.id
    }),
    upsertUser({
      username: "disabled_dispatcher",
      password: "disabled123456",
      name: "停用调配员示例",
      phone: "13800000009",
      roleCode: RoleCode.dispatcher,
      roleId: roles.dispatcher.id,
      status: "disabled"
    })
  ]);

  return Object.fromEntries(users.map((user) => [user.username, user]));
}

async function upsertUser(input: {
  username: string;
  password: string;
  name: string;
  phone: string;
  roleCode: RoleCode;
  roleId: string;
  hotelId?: string;
  butlerId?: string;
  status?: "active" | "disabled";
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.upsert({
    where: { username: input.username },
    update: {
      passwordHash,
      name: input.name,
      phone: input.phone,
      roleCode: input.roleCode,
      roleId: input.roleId,
      hotelId: input.hotelId ?? null,
      butlerId: input.butlerId ?? null,
      status: input.status ?? "active"
    },
    create: {
      username: input.username,
      passwordHash,
      name: input.name,
      phone: input.phone,
      roleCode: input.roleCode,
      roleId: input.roleId,
      hotelId: input.hotelId ?? null,
      butlerId: input.butlerId ?? null,
      status: input.status ?? "active"
    }
  });
}

async function upsertButlerUser(input: {
  username: string;
  password: string;
  name: string;
  phone: string;
  roleCode: RoleCode;
  roleId: string;
  butlerId: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const existing = await prisma.user.findUnique({
    where: { butlerId: input.butlerId },
    select: { id: true }
  });
  const data = {
    username: input.username,
    passwordHash,
    name: input.name,
    phone: input.phone,
    roleCode: input.roleCode,
    roleId: input.roleId,
    butlerId: input.butlerId,
    hotelId: null,
    status: "active" as const
  };

  return existing
    ? prisma.user.update({ where: { id: existing.id }, data })
    : prisma.user.create({ data });
}

async function seedSystemDicts() {
  const dicts = [
    { dictType: "pickup_type", label: "接飞机", value: "airport", sort: 1 },
    { dictType: "pickup_type", label: "接火车", value: "train", sort: 2 },
    { dictType: "leave_type", label: "事假", value: "personal", sort: 1 },
    { dictType: "leave_type", label: "病假", value: "sick", sort: 2 },
    { dictType: "leave_type", label: "休息", value: "rest", sort: 3 },
    { dictType: "leave_type", label: "其他", value: "other", sort: 4 },
    { dictType: "leave_type", label: "事假", value: "personal_leave", sort: 11 },
    { dictType: "leave_type", label: "病假", value: "sick_leave", sort: 12 },
    { dictType: "reject_reason", label: "时间冲突", value: "time_conflict", sort: 1 },
    { dictType: "reject_reason", label: "身体原因", value: "health_reason", sort: 2 },
    { dictType: "reject_reason", label: "临时有事", value: "temporary_matter", sort: 3 },
    { dictType: "review_tag", label: "准时", value: "ontime", sort: 1 },
    { dictType: "review_tag", label: "热情", value: "warm", sort: 2 },
    { dictType: "review_tag", label: "细心", value: "careful", sort: 3 },
    { dictType: "room_type", label: "海景大床房", value: "sea_king", sort: 1 },
    { dictType: "room_type", label: "亲子套房", value: "family_suite", sort: 2 },
    { dictType: "notification_type", label: "派单通知", value: "dispatch_assigned", sort: 1 },
    { dictType: "notification_type", label: "请假审核", value: "leave_review", sort: 2 },
    { dictType: "notification_type", label: "收到评价", value: "review_received", sort: 3 }
  ];

  await Promise.all(
    dicts.map((dict) =>
      prisma.systemDict.upsert({
        where: {
          dictType_value: {
            dictType: dict.dictType,
            value: dict.value
          }
        },
        update: {
          label: dict.label,
          sort: dict.sort,
          enabled: true
        },
        create: {
          ...dict,
          enabled: true
        }
      })
    )
  );
}

async function seedOrders(
  hotels: Awaited<ReturnType<typeof seedHotels>>,
  butlers: Awaited<ReturnType<typeof seedButlers>>,
  users: Record<string, Awaited<ReturnType<typeof upsertUser>>>
) {
  const pendingOne = await upsertOrder({
    orderNo: "OD-SEED-PENDING-001",
    hotelId: hotels[0].id,
    createdById: users.frontdesk.id,
    guestName: "陈先生",
    guestPhone: "13600030001",
    guestCount: 2,
    checkInDate: daysFromNow(2, 15),
    checkOutDate: daysFromNow(5, 12),
    roomType: "海景大床房",
    roomNo: "待定",
    pickupType: "airport",
    arrivalStation: "大理凤仪机场",
    arrivalTime: daysFromNow(2, 13),
    flightTrainNo: "MU5710",
    specialNeeds: "带儿童安全座椅",
    remark: "测试待分配订单",
    status: "pending_dispatch"
  });

  await upsertOrder({
    orderNo: "OD-SEED-PENDING-002",
    hotelId: hotels[1].id,
    createdById: users.frontdesk02.id,
    guestName: "林女士",
    guestPhone: "13600030002",
    guestCount: 3,
    checkInDate: daysFromNow(3, 16),
    checkOutDate: daysFromNow(6, 12),
    roomType: "亲子套房",
    roomNo: "B302",
    pickupType: "train",
    arrivalStation: "大理站",
    arrivalTime: daysFromNow(3, 14),
    flightTrainNo: "D8734",
    specialNeeds: "行李较多",
    remark: "测试待分配订单",
    status: "pending_dispatch"
  });

  const multiPending = await upsertOrder({
    orderNo: "OD-SEED-MULTI-001",
    hotelId: hotels[0].id,
    createdById: users.frontdesk.id,
    guestName: "王先生",
    guestPhone: "13600030003",
    guestCount: 4,
    checkInDate: daysFromNow(4, 15),
    checkOutDate: daysFromNow(7, 12),
    roomType: "庭院套房",
    roomNo: "A201",
    pickupType: "airport",
    arrivalStation: "大理凤仪机场",
    arrivalTime: daysFromNow(4, 11),
    flightTrainNo: "CA1415",
    specialNeeds: "需要两辆车",
    remark: "测试多管家待确认订单",
    status: "pending_confirm"
  });

  const confirmed = await upsertOrder({
    orderNo: "OD-SEED-CONFIRMED-001",
    hotelId: hotels[1].id,
    createdById: users.frontdesk02.id,
    guestName: "赵女士",
    guestPhone: "13600030004",
    guestCount: 2,
    checkInDate: daysFromNow(5, 15),
    checkOutDate: daysFromNow(8, 12),
    roomType: "湖景双床房",
    roomNo: "C508",
    pickupType: "train",
    arrivalStation: "大理站",
    arrivalTime: daysFromNow(5, 10),
    flightTrainNo: "D8112",
    specialNeeds: null,
    remark: "测试已确认订单",
    status: "confirmed"
  });

  const pendingReview = await upsertOrder({
    orderNo: "OD-SEED-REVIEW-001",
    hotelId: hotels[0].id,
    createdById: users.frontdesk.id,
    guestName: "周先生",
    guestPhone: "13600030005",
    guestCount: 2,
    checkInDate: daysFromNow(-3, 15),
    checkOutDate: daysFromNow(-1, 12),
    roomType: "露台大床房",
    roomNo: "A305",
    pickupType: "airport",
    arrivalStation: "大理凤仪机场",
    arrivalTime: daysFromNow(-3, 12),
    flightTrainNo: "MU1001",
    specialNeeds: "评价流程测试",
    remark: "测试待评价订单",
    status: "pending_review"
  });

  const reviewed = await upsertOrder({
    orderNo: "OD-SEED-REVIEWED-001",
    hotelId: hotels[1].id,
    createdById: users.frontdesk02.id,
    guestName: "刘女士",
    guestPhone: "13600030006",
    guestCount: 3,
    checkInDate: daysFromNow(-6, 15),
    checkOutDate: daysFromNow(-4, 12),
    roomType: "湖景套房",
    roomNo: "C606",
    pickupType: "train",
    arrivalStation: "大理站",
    arrivalTime: daysFromNow(-6, 10),
    flightTrainNo: "D9001",
    specialNeeds: null,
    remark: "测试已评价订单",
    status: "reviewed",
    settlementStatus: "settled",
    settlementRemark: "已线下结算"
  });

  const assignments = await Promise.all([
    upsertAssignment({
      orderId: multiPending.id,
      butlerId: butlers[0].id,
      assignedById: users.dispatcher.id,
      status: "pending_confirm"
    }),
    upsertAssignment({
      orderId: multiPending.id,
      butlerId: butlers[1].id,
      assignedById: users.dispatcher.id,
      status: "pending_confirm"
    }),
    upsertAssignment({
      orderId: confirmed.id,
      butlerId: butlers[2].id,
      assignedById: users.dispatcher.id,
      status: "confirmed",
      confirmedAt: daysFromNow(-1, 10)
    }),
    upsertAssignment({
      orderId: confirmed.id,
      butlerId: butlers[3].id,
      assignedById: users.dispatcher.id,
      status: "confirmed",
      confirmedAt: daysFromNow(-1, 10)
    }),
    upsertAssignment({
      orderId: pendingReview.id,
      butlerId: butlers[2].id,
      assignedById: users.dispatcher.id,
      status: "completed",
      confirmedAt: daysFromNow(-4, 9),
      completedAt: daysFromNow(-3, 18)
    }),
    upsertAssignment({
      orderId: pendingReview.id,
      butlerId: butlers[4].id,
      assignedById: users.dispatcher.id,
      status: "completed",
      confirmedAt: daysFromNow(-4, 9),
      completedAt: daysFromNow(-3, 18)
    }),
    upsertAssignment({
      orderId: reviewed.id,
      butlerId: butlers[2].id,
      assignedById: users.dispatcher.id,
      status: "completed",
      confirmedAt: daysFromNow(-7, 9),
      completedAt: daysFromNow(-6, 18)
    })
  ]);

  await seedLeavesAndReviews(butlers, users, assignments, reviewed.id);
  await seedNotificationsAndLogs(
    [pendingOne, multiPending, confirmed, pendingReview, reviewed],
    butlers,
    users
  );

  await prisma.butler.update({
    where: { id: butlers[0].id },
    data: { status: "pending_confirm" }
  });
  await prisma.butler.update({
    where: { id: butlers[1].id },
    data: { status: "pending_confirm" }
  });
  await prisma.butler.update({
    where: { id: butlers[2].id },
    data: { status: "confirmed_waiting" }
  });
  await prisma.butler.update({
    where: { id: butlers[3].id },
    data: { status: "confirmed_waiting" }
  });
  await prisma.butler.update({
    where: { id: butlers[4].id },
    data: { status: "available" }
  });

  return [pendingOne, multiPending, confirmed, pendingReview, reviewed];
}

async function upsertOrder(input: {
  orderNo: string;
  hotelId: string;
  createdById: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  checkInDate: Date;
  checkOutDate: Date;
  roomType: string;
  roomNo: string;
  pickupType: "airport" | "train";
  arrivalStation: string;
  arrivalTime: Date;
  flightTrainNo: string;
  specialNeeds: string | null;
  remark: string;
  status:
    | "pending_dispatch"
    | "pending_confirm"
    | "partial_rejected"
    | "confirmed"
    | "pending_review"
    | "reviewed";
  settlementStatus?: "unsettled" | "settled";
  settlementRemark?: string | null;
}) {
  const serviceStartAt = new Date(
    Math.min(input.arrivalTime.getTime(), input.checkInDate.getTime())
  );
  const serviceEndAt = new Date(input.checkOutDate);
  serviceEndAt.setHours(23, 59, 59, 999);

  return prisma.serviceOrder.upsert({
    where: { orderNo: input.orderNo },
    update: {
      hotelId: input.hotelId,
      createdById: input.createdById,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestCount: input.guestCount,
      serviceMode: "stay",
      serviceStartAt,
      serviceEndAt,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      roomType: input.roomType,
      roomNo: input.roomNo,
      pickupType: input.pickupType,
      arrivalStation: input.arrivalStation,
      arrivalTime: input.arrivalTime,
      flightTrainNo: input.flightTrainNo,
      specialNeeds: input.specialNeeds,
      remark: input.remark,
      status: input.status,
      settlementStatus: input.settlementStatus ?? "unsettled",
      settlementRemark: input.settlementRemark ?? null,
      settledAt: input.settlementStatus === "settled" ? new Date() : null,
      settledById: input.settlementStatus === "settled" ? input.createdById : null
    },
    create: {
      ...input,
      serviceMode: "stay",
      serviceStartAt,
      serviceEndAt,
      destination: null,
      settlementAmount: null,
      settlementStatus: input.settlementStatus ?? "unsettled",
      settlementRemark: input.settlementRemark ?? null,
      settledAt: input.settlementStatus === "settled" ? new Date() : null,
      settledById: input.settlementStatus === "settled" ? input.createdById : null
    }
  });
}

async function upsertAssignment(input: {
  orderId: string;
  butlerId: string;
  assignedById: string;
  status: "pending_confirm" | "confirmed" | "completed";
  confirmedAt?: Date;
  completedAt?: Date;
}) {
  return prisma.orderButlerAssignment.upsert({
    where: {
      orderId_butlerId: {
        orderId: input.orderId,
        butlerId: input.butlerId
      }
    },
    update: {
      status: input.status,
      assignedById: input.assignedById,
      confirmedAt: input.confirmedAt ?? null,
      rejectedAt: null,
      pickedGuestAt: null,
      serviceStartedAt: null,
      completedAt: input.completedAt ?? null,
      reassignedAt: null,
      cancelledAt: null,
      rejectReason: null
    },
    create: {
      orderId: input.orderId,
      butlerId: input.butlerId,
      assignedById: input.assignedById,
      status: input.status,
      confirmedAt: input.confirmedAt ?? null,
      completedAt: input.completedAt ?? null
    }
  });
}

async function seedLeavesAndReviews(
  butlers: Awaited<ReturnType<typeof seedButlers>>,
  users: Record<string, Awaited<ReturnType<typeof upsertUser>>>,
  assignments: Array<Awaited<ReturnType<typeof upsertAssignment>>>,
  reviewedOrderId: string
) {
  await upsertLeave({
    butlerId: butlers[4].id,
    leaveType: "personal",
    reason: "家庭事务，测试待审核请假",
    startAt: daysFromNow(10, 9),
    endAt: daysFromNow(12, 18),
    status: "pending"
  });

  await upsertLeave({
    butlerId: butlers[2].id,
    leaveType: "rest",
    reason: "调休，测试已通过请假",
    startAt: daysFromNow(14, 9),
    endAt: daysFromNow(14, 18),
    status: "approved",
    reviewerId: users.dispatcher.id,
    reviewedAt: daysFromNow(-1, 10)
  });

  const reviewedAssignment = assignments.find(
    (assignment) => assignment.orderId === reviewedOrderId
  );

  if (reviewedAssignment) {
    await prisma.serviceReview.upsert({
      where: {
        assignmentId_reviewerRole: {
          assignmentId: reviewedAssignment.id,
          reviewerRole: RoleCode.hotel_frontdesk
        }
      },
      update: {
        reviewerId: users.frontdesk02.id,
        butlerId: reviewedAssignment.butlerId,
        orderId: reviewedAssignment.orderId,
        score: 5,
        overallScore: 5,
        attitudeScore: 5,
        punctualityScore: 5,
        communicationScore: 5,
        complaintFlag: false,
        tags: ["准时", "热情", "细心"],
        content: "服务很好，接待细致。"
      },
      create: {
        assignmentId: reviewedAssignment.id,
        orderId: reviewedAssignment.orderId,
        butlerId: reviewedAssignment.butlerId,
        reviewerId: users.frontdesk02.id,
        reviewerRole: RoleCode.hotel_frontdesk,
        score: 5,
        overallScore: 5,
        attitudeScore: 5,
        punctualityScore: 5,
        communicationScore: 5,
        complaintFlag: false,
        tags: ["准时", "热情", "细心"],
        content: "服务很好，接待细致。"
      }
    });

    await refreshSeedButlerReviewStats(reviewedAssignment.butlerId);
  }
}

async function seedNotificationsAndLogs(
  orders: Awaited<ReturnType<typeof seedOrders>>,
  butlers: Awaited<ReturnType<typeof seedButlers>>,
  users: Record<string, Awaited<ReturnType<typeof upsertUser>>>
) {
  const [pendingOrder, multiOrder, confirmedOrder, pendingReviewOrder, reviewedOrder] =
    orders;

  await prisma.notification.createMany({
    data: [
      {
        recipientId: users.dispatcher.id,
        title: "新的请假申请",
        content: `管家 ${butlers[4].name} 提交了请假申请，请及时审核。`,
        type: "leave_created",
        targetType: "ButlerLeave",
        targetId: pendingOrder.id
      },
      {
        recipientId: users.frontdesk.id,
        title: "服务已完成",
        content: `订单 ${pendingReviewOrder.orderNo} 已完成服务，等待评价。`,
        type: "service_completed",
        targetType: "ServiceOrder",
        targetId: pendingReviewOrder.id
      },
      {
        recipientId: users.finance.id,
        title: "新的评价记录",
        content: `订单 ${reviewedOrder.orderNo} 已有评价记录，可用于财务对账。`,
        type: "review_received",
        targetType: "ServiceOrder",
        targetId: reviewedOrder.id,
        isRead: true,
        readAt: new Date()
      }
    ]
  });

  await prisma.operationLog.createMany({
    data: [
      {
        operatorId: users.dispatcher.id,
        operationType: "DISPATCH_ORDER",
        targetType: "ServiceOrder",
        targetId: multiOrder.id,
        remark: "Seed 生成的多管家派单记录"
      },
      {
        operatorId: users.frontdesk.id,
        operationType: "CREATE_ORDER",
        targetType: "ServiceOrder",
        targetId: pendingOrder.id,
        remark: "Seed 生成的前台创建订单记录"
      },
      {
        operatorId: users.finance.id,
        operationType: "UPDATE_SETTLEMENT_STATUS",
        targetType: "ServiceOrder",
        targetId: reviewedOrder.id,
        remark: "Seed 生成的结算状态记录"
      }
    ]
  });

  await prisma.abnormalRecord.createMany({
    data: [
      {
        orderId: confirmedOrder.id,
        butlerId: butlers[3].id,
        abnormalType: "manual_mark",
        description: "接站车辆临时晚点，已手动跟进。",
        status: "resolved",
        createdById: users.dispatcher.id,
        handledById: users.dispatcher.id,
        handledAt: new Date(),
        handleResult: "已协调调整接站时间"
      },
      {
        orderId: pendingReviewOrder.id,
        butlerId: butlers[4].id,
        abnormalType: "frontdesk_complaint",
        description: "前台记录客人对行李协助响应较慢。",
        status: "pending",
        createdById: users.frontdesk.id
      }
    ]
  });
}

async function upsertLeave(input: {
  butlerId: string;
  leaveType: string;
  reason: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "approved";
  reviewerId?: string;
  reviewedAt?: Date;
}) {
  const existing = await prisma.butlerLeave.findFirst({
    where: {
      butlerId: input.butlerId,
      leaveType: input.leaveType,
      reason: input.reason
    }
  });

  if (existing) {
    return prisma.butlerLeave.update({
      where: { id: existing.id },
      data: input
    });
  }

  return prisma.butlerLeave.create({
    data: input
  });
}

async function refreshSeedButlerReviewStats(butlerId: string) {
  const aggregate = await prisma.serviceReview.aggregate({
    where: { butlerId },
    _avg: { overallScore: true },
    _count: { _all: true }
  });

  await prisma.butler.update({
    where: { id: butlerId },
    data: {
      averageScore: Number((aggregate._avg.overallScore ?? 0).toFixed(2)),
      reviewCount: aggregate._count._all
    }
  });
}

function daysFromNow(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
