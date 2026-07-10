import { AssignmentStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export const orderOccupyingAssignmentStatuses: AssignmentStatus[] = [
  "pending_confirm",
  "confirmed",
  "picked_guest",
  "in_service"
];

export type OrderWindowSource = {
  arrivalTime: Date;
  checkInDate: Date;
  checkOutDate: Date;
};

export type TimeWindow = {
  startAt: Date;
  endAt: Date;
};

export type ButlerOrderTimeConflict = {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  orderId: string;
  orderNo: string;
  orderStatus: string;
  window: TimeWindow;
};

/**
 * 订单占用管家的时间段统一按入住服务窗口计算：
 * 从“到达时间”和“入住日期”中较早者开始，到“离店日期”当天结束。
 * 离店日期是订单必填字段；如果录入值不晚于开始时间，调用方应在订单校验层拦截。
 */
export function getOrderServiceWindow(order: OrderWindowSource): TimeWindow {
  const startAt = new Date(
    Math.min(order.arrivalTime.getTime(), order.checkInDate.getTime())
  );
  const endAt = getOrderServiceEndOfDay(order);

  return { startAt, endAt };
}

export function getOrderServiceEndOfDay(order: Pick<OrderWindowSource, "checkOutDate">) {
  const endAt = new Date(order.checkOutDate);
  endAt.setHours(23, 59, 59, 999);
  return endAt;
}

export function isOrderServiceWindowExpired(
  order: Pick<OrderWindowSource, "checkOutDate">,
  now = new Date()
) {
  return getOrderServiceEndOfDay(order) < now;
}

export function timeWindowsOverlap(left: TimeWindow, right: TimeWindow) {
  return left.startAt < right.endAt && left.endAt > right.startAt;
}

export function formatOrderWindow(window: TimeWindow) {
  return `${formatDateTime(window.startAt)} 至 ${formatDateTime(window.endAt)}`;
}

export async function findButlerOrderTimeConflicts(
  butlerId: string,
  targetWindow: TimeWindow,
  client: DbClient = prisma,
  options?: {
    excludeOrderId?: string;
  }
) {
  const assignments = await client.orderButlerAssignment.findMany({
    where: {
      butlerId,
      orderId: options?.excludeOrderId
        ? { not: options.excludeOrderId }
        : undefined,
      status: {
        in: orderOccupyingAssignmentStatuses
      },
      order: {
        status: {
          notIn: ["cancelled", "abnormal", "pending_review", "reviewed", "completed"]
        }
      }
    },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          arrivalTime: true,
          checkInDate: true,
          checkOutDate: true
        }
      }
    },
    orderBy: {
      order: {
        arrivalTime: "asc"
      }
    }
  });

  return assignments
    .map((assignment): ButlerOrderTimeConflict => {
      const window = getOrderServiceWindow(assignment.order);

      return {
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        orderId: assignment.order.id,
        orderNo: assignment.order.orderNo,
        orderStatus: assignment.order.status,
        window
      };
    })
    .filter((item) => timeWindowsOverlap(targetWindow, item.window));
}

export async function findOrderAssignmentTimeConflictsAfterOrderChange(
  orderId: string,
  targetWindow: TimeWindow,
  client: DbClient = prisma
) {
  const assignments = await client.orderButlerAssignment.findMany({
    where: {
      orderId,
      status: {
        in: orderOccupyingAssignmentStatuses
      }
    },
    select: {
      butlerId: true,
      butler: {
        select: {
          name: true
        }
      }
    }
  });

  const conflicts = await Promise.all(
    assignments.map(async (assignment) => {
      const items = await findButlerOrderTimeConflicts(
        assignment.butlerId,
        targetWindow,
        client,
        { excludeOrderId: orderId }
      );

      return items.map((item) => ({
        butlerId: assignment.butlerId,
        butlerName: assignment.butler.name,
        ...item
      }));
    })
  );

  return conflicts.flat();
}

function formatDateTime(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");

  return [
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}`
  ].join(" ");
}
