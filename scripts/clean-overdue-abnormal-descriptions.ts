import { prisma } from "@/lib/prisma";
import {
  getOrderServiceEndOfDay,
  getOrderServiceWindow
} from "@/lib/order-conflicts";

const abnormalTypes = [
  "assignment_confirm_timeout",
  "assignment_service_overdue"
];

async function main() {
  const records = await prisma.abnormalRecord.findMany({
    where: {
      abnormalType: { in: abnormalTypes },
      orderId: { not: null },
      butlerId: { not: null }
    },
    include: {
      order: {
        select: {
          serviceMode: true,
          serviceStartAt: true,
          serviceEndAt: true,
          checkInDate: true,
          checkOutDate: true,
          arrivalTime: true
        }
      },
      butler: {
        select: {
          name: true
        }
      }
    }
  });

  let updated = 0;

  for (const record of records) {
    if (!record.order || !record.butler) {
      continue;
    }

    const nextDescription = buildDescription(record);
    if (record.description === nextDescription) {
      continue;
    }

    await prisma.abnormalRecord.update({
      where: { id: record.id },
      data: { description: nextDescription }
    });
    updated += 1;
  }

  console.log(JSON.stringify({ scanned: records.length, updated }, null, 2));
}

function buildDescription(record: {
  abnormalType: string;
  createdAt: Date;
  order: {
    serviceMode: "stay" | "transport";
    serviceStartAt: Date;
    serviceEndAt: Date;
    checkInDate: Date;
    checkOutDate: Date;
    arrivalTime: Date;
  } | null;
  butler: { name: string } | null;
}) {
  const order = record.order;
  const butler = record.butler;
  if (!order || !butler) {
    return "";
  }

  const isConfirmTimeout = record.abnormalType === "assignment_confirm_timeout";
  const title = isConfirmTimeout ? "管家超时未确认" : "管家确认后超期未完成";
  const action = isConfirmTimeout
    ? order.serviceMode === "transport" ? "未在接送服务开始前确认接单" : "未在入住服务开始前确认接单"
    : order.serviceMode === "transport" ? "已确认接单，但到接送服务结束仍未完成服务" : "已确认接单，但到离店日结束仍未完成服务";
  const deadline = isConfirmTimeout
    ? getOrderServiceWindow(order).startAt
    : getOrderServiceEndOfDay(order);

  return [
    `${title}：管家 ${butler.name} ${action}。`,
    `应处理时间：${formatDateTime(deadline)}，发现时间：${formatDateTime(record.createdAt)}。`
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
