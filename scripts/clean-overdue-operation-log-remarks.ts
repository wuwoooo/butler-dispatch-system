import { prisma } from "@/lib/prisma";
import {
  getOrderServiceEndOfDay,
  getOrderServiceWindow
} from "@/lib/order-conflicts";

async function main() {
  const logs = await prisma.operationLog.findMany({
    where: {
      operationType: "RESOLVE_OVERDUE_ASSIGNMENT",
      targetType: "OrderButlerAssignment",
      targetId: { not: null }
    },
    select: {
      id: true,
      targetId: true,
      beforeData: true,
      remark: true,
      createdAt: true
    }
  });

  let updated = 0;

  for (const log of logs) {
    if (!log.targetId) {
      continue;
    }

    const assignment = await prisma.orderButlerAssignment.findUnique({
      where: { id: log.targetId },
      select: {
        id: true,
        order: {
          select: {
            serviceMode: true,
            serviceStartAt: true,
            serviceEndAt: true,
            arrivalTime: true,
            checkInDate: true,
            checkOutDate: true
          }
        },
        butler: {
          select: {
            name: true
          }
        }
      }
    });

    if (!assignment) {
      continue;
    }

    const previousStatus = getPreviousStatus(log.beforeData);
    const nextRemark = buildRemark({
      previousStatus,
      butlerName: assignment.butler.name,
      order: assignment.order,
      discoveredAt: log.createdAt
    });

    if (!nextRemark || log.remark === nextRemark) {
      continue;
    }

    await prisma.operationLog.update({
      where: { id: log.id },
      data: { remark: nextRemark }
    });
    updated += 1;
  }

  console.log(JSON.stringify({ scanned: logs.length, updated }, null, 2));
}

function getPreviousStatus(value: unknown) {
  if (typeof value === "object" && value !== null && "status" in value) {
    const status = (value as { status?: unknown }).status;
    return typeof status === "string" ? status : null;
  }

  return null;
}

function buildRemark(input: {
  previousStatus: string | null;
  butlerName: string;
  order: {
    serviceMode: "stay" | "transport";
    serviceStartAt: Date;
    serviceEndAt: Date;
    arrivalTime: Date;
    checkInDate: Date;
    checkOutDate: Date;
  };
  discoveredAt: Date;
}) {
  const isConfirmTimeout = input.previousStatus === "pending_confirm";
  const isServiceOverdue = input.previousStatus === "confirmed";

  if (!isConfirmTimeout && !isServiceOverdue) {
    return null;
  }

  const title = isConfirmTimeout ? "管家超时未确认" : "管家确认后超期未完成";
  const action = isConfirmTimeout
    ? input.order.serviceMode === "transport" ? "未在接送服务开始前确认接单" : "未在入住服务开始前确认接单"
    : input.order.serviceMode === "transport" ? "已确认接单，但到接送服务结束仍未完成服务" : "已确认接单，但到离店日结束仍未完成服务";
  const deadline = isConfirmTimeout
    ? getOrderServiceWindow(input.order).startAt
    : getOrderServiceEndOfDay(input.order);

  return [
    `${title}：管家 ${input.butlerName} ${action}。`,
    `应处理时间：${formatDateTime(deadline)}，发现时间：${formatDateTime(input.discoveredAt)}。`
  ].join("");
}

function formatDateTime(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
