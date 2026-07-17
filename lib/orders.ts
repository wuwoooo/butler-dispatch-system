import {
  AssignmentStatus,
  OrderStatus,
  Prisma,
  PrismaClient
} from "@prisma/client";
import {
  formatOrderWindow,
  getOrderServiceWindow,
  orderOccupyingAssignmentStatuses,
  timeWindowsOverlap
} from "@/lib/order-conflicts";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/types/auth";
import {
  resolveRecommendedVehicle,
  sortVehicleRecommendationCandidates
} from "@/lib/vehicle-recommendation";

type DbClient = Prisma.TransactionClient | PrismaClient;

export const dispatchableOrderStatuses: OrderStatus[] = [
  "pending_dispatch",
  "partial_rejected"
];

export const unavailableSameOrderStatuses: AssignmentStatus[] = [
  "pending_confirm",
  "confirmed",
  "picked_guest",
  "in_service",
  "reassigned"
];

export function buildOrderScopeWhere(user: AuthenticatedUser) {
  if (user.roleCode === "hotel_frontdesk") {
    return { hotelId: user.hotelId ?? "__none__" };
  }

  if (user.roleCode === "butler") {
    return {
      assignments: {
        some: {
          butlerId: user.butlerId ?? "__none__"
        }
      }
    };
  }

  return {};
}

export async function generateOrderNo(client: DbClient = prisma) {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");

  for (let index = 0; index < 10; index += 1) {
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const orderNo = `OD${datePart}${randomPart}`;
    const exists = await client.serviceOrder.findUnique({
      where: { orderNo },
      select: { id: true }
    });

    if (!exists) {
      return orderNo;
    }
  }

  return `OD${datePart}${Date.now()}`;
}

export async function getOrderDetail(orderId: string, client: DbClient = prisma) {
  const order = await client.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
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
        include: {
          butler: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
              status: true,
              rejectCount: true,
              vehicleType: true,
              vehicleInfo: true
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
      },
      rejectRecords: {
        orderBy: { createdAt: "desc" },
        include: {
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
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          butler: {
            select: {
              id: true,
              name: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              roleCode: true
            }
          }
        }
      },
      stayExtensions: {
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: {
            select: { id: true, name: true, roleCode: true }
          },
          reviewedBy: {
            select: { id: true, name: true, roleCode: true }
          }
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  const stayExtensionIds = order.stayExtensions.map((extension) => extension.id);

  const [operationLogs, notifications] = await Promise.all([
    client.operationLog.findMany({
      where: {
        OR: [
          {
            targetType: "ServiceOrder",
            targetId: orderId
          },
          {
            targetType: "OrderStayExtension",
            targetId: { in: stayExtensionIds }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        operator: {
          select: {
            id: true,
            username: true,
            name: true,
            roleCode: true
          }
        }
      }
    }),
    client.notification.findMany({
      where: {
        targetType: "ServiceOrder",
        targetId: orderId
      },
      orderBy: { createdAt: "desc" },
      include: {
        recipient: {
          select: {
            id: true,
            username: true,
            name: true,
            roleCode: true
          }
        }
      }
    })
  ]);

  return {
    ...order,
    operationLogs,
    notifications
  };
}

export async function getButlerAvailabilityForOrder(
  orderId: string,
  client: DbClient = prisma
) {
  const order = await client.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      guestCount: true,
      requestedVehicleType: true,
      serviceStartAt: true,
      serviceEndAt: true,
      arrivalTime: true,
      checkInDate: true,
      checkOutDate: true
    }
  });

  if (!order) {
    return null;
  }

  const orderWindow = getOrderServiceWindow(order);
  const recommendation = resolveRecommendedVehicle({
    guestCount: order.guestCount,
    requestedVehicleType: order.requestedVehicleType
  });
  const butlers = await client.butler.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      assignments: {
        where: {
          OR: [
            {
              orderId,
              status: {
                in: unavailableSameOrderStatuses
              }
            },
            {
              status: {
                in: orderOccupyingAssignmentStatuses
              },
              order: {
                status: {
                  notIn: [
                    "cancelled",
                    "abnormal",
                    "pending_review",
                    "reviewed",
                    "completed"
                  ]
                }
              }
            }
          ]
        },
        select: {
          id: true,
          orderId: true,
          status: true,
          order: {
            select: {
              orderNo: true,
              serviceStartAt: true,
              serviceEndAt: true,
              arrivalTime: true,
              checkInDate: true,
              checkOutDate: true,
              status: true
            }
          }
        }
      },
      leaves: {
        where: {
          status: {
            in: ["approved", "active"]
          },
          startAt: {
            lt: orderWindow.endAt
          },
          endAt: {
            gt: orderWindow.startAt
          }
        },
        select: {
          id: true,
          leaveType: true,
          startAt: true,
          endAt: true,
          status: true
        }
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          status: true
        }
      }
    }
  });

  const candidates = butlers.map((butler) => {
    const reasons: string[] = [];

    if (butler.status === "disabled") {
      reasons.push("管家已停用");
    }

    if (!butler.dispatchEnabled) {
      reasons.push("管家暂停接单");
    }

    if (butler.status === "on_leave") {
      reasons.push("管家请假中");
    }

    if (butler.leaves.length > 0) {
      reasons.push("订单时间与已通过请假冲突");
    }

    const sameOrderAssignment = butler.assignments.find(
      (assignment) => assignment.orderId === orderId
    );

    if (sameOrderAssignment) {
      reasons.push("该订单已有该管家有效派单");
    }

    const conflictingAssignments = butler.assignments.filter((assignment) => {
      if (assignment.orderId === orderId) {
        return false;
      }

      return timeWindowsOverlap(
        orderWindow,
        getOrderServiceWindow(assignment.order)
      );
    });

    for (const assignment of conflictingAssignments) {
      reasons.push(
        `订单时间与已分配订单 ${assignment.order.orderNo}（${formatOrderWindow(
          getOrderServiceWindow(assignment.order)
        )}）冲突`
      );
    }

    return {
      id: butler.id,
      code: butler.code,
      name: butler.name,
      phone: butler.phone,
      status: butler.status,
      vehicleType: butler.vehicleType,
      vehicleInfo: butler.vehicleInfo,
      dispatchEnabled: butler.dispatchEnabled,
      user: butler.user,
      available: reasons.length === 0,
      unavailableReasons: reasons,
      recommended: butler.vehicleType === recommendation.vehicleType,
      recommendedVehicleType: recommendation.vehicleType,
      recommendationSource: recommendation.source
    };
  });

  return sortVehicleRecommendationCandidates(candidates);
}
