import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OperationLogInput = {
  operatorId?: string | null;
  operationType: string;
  targetType: string;
  targetId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  remark?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeOperationLog(input: OperationLogInput) {
  try {
    await prisma.operationLog.create({
      data: {
        operatorId: input.operatorId ?? null,
        operationType: input.operationType,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        beforeData: toJson(input.beforeData),
        afterData: toJson(input.afterData),
        remark: input.remark ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  } catch (error) {
    console.error("写入操作日志失败", error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
