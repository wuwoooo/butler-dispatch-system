import { Prisma } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  phone: true,
  roleCode: true,
  status: true,
  hotelId: true,
  butlerId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      code: true,
      name: true
    }
  },
  hotel: {
    select: {
      id: true,
      code: true,
      name: true
    }
  },
  butler: {
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      status: true
    }
  }
} as const;

export const hotelPublicSelect = {
  id: true,
  code: true,
  name: true,
  address: true,
  contactName: true,
  contactPhone: true,
  phone: true,
  status: true,
  roomTypes: {
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      sort: true,
      enabled: true,
      remark: true
    }
  },
  _count: {
    select: {
      users: true,
      orders: true,
      roomTypes: true
    }
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.HotelSelect;

export const butlerPublicSelect = {
  id: true,
  code: true,
  name: true,
  phone: true,
  gender: true,
  vehicleInfo: true,
  dispatchEnabled: true,
  status: true,
  averageScore: true,
  reviewCount: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      username: true,
      name: true,
      status: true
    }
  }
} as const;

/** 管家管理页专用选择集，包含账号状态和小程序时间，但响应前必须移除 openid。 */
export const butlerWithAccountSelect = {
  ...butlerPublicSelect,
  assignments: {
    where: {
      status: {
        in: ["pending_confirm", "confirmed", "picked_guest", "in_service"]
      },
      order: {
        status: {
          notIn: ["cancelled", "abnormal", "pending_review", "reviewed", "completed"]
        }
      }
    },
    orderBy: { assignedAt: "asc" },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      confirmedAt: true,
      pickedGuestAt: true,
      serviceStartedAt: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          guestName: true,
          checkInDate: true,
          checkOutDate: true,
          arrivalTime: true,
          hotel: {
            select: {
              name: true
            }
          }
        }
      }
    }
  },
  user: {
    select: {
      id: true,
      username: true,
      name: true,
      status: true,
      lastLoginAt: true,
      lastMiniProgramLoginAt: true,
      miniProgramBoundAt: true,
      wechatOpenId: true,
      createdAt: true
    }
  }
} satisfies Prisma.ButlerSelect;

export const orderListSelect = {
  id: true,
  orderNo: true,
  guestName: true,
  guestPhone: true,
  guestCount: true,
  checkInDate: true,
  checkOutDate: true,
  roomType: true,
  roomNo: true,
  pickupType: true,
  arrivalStation: true,
  arrivalTime: true,
  flightTrainNo: true,
  destination: true,
  specialNeeds: true,
  status: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  hotel: {
    select: {
      id: true,
      code: true,
      name: true
    }
  },
  createdBy: {
    select: {
      id: true,
      username: true,
      name: true,
      roleCode: true
    }
  },
  assignments: {
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      assignedAt: true,
      confirmedAt: true,
      rejectedAt: true,
      pickedGuestAt: true,
      serviceStartedAt: true,
      completedAt: true,
      cancelledAt: true,
      rejectReason: true,
      remark: true,
      butler: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          status: true
        }
      },
      assignedBy: {
        select: {
          id: true,
          username: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.ServiceOrderSelect;

export const orderDetailSelect = {
  ...orderListSelect,
  rejectRecords: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      createdAt: true,
      butler: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.ServiceOrderSelect;
