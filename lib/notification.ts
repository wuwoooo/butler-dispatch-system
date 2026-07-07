import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export type NotificationInput = {
  recipientId?: string | null;
  title: string;
  content: string;
  type: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: unknown;
};

export async function createNotification(
  input: NotificationInput,
  client: DbClient = prisma
) {
  return client.notification.create({
    data: {
      recipientId: input.recipientId ?? null,
      title: input.title,
      content: input.content,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      payload: toJson(input.payload)
    }
  });
}

export async function notifyUsers(
  userIds: Array<string | null | undefined>,
  input: Omit<NotificationInput, "recipientId">,
  client: DbClient = prisma
) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean))) as string[];

  if (uniqueIds.length === 0) {
    return [];
  }

  return Promise.all(
    uniqueIds.map((recipientId) =>
      createNotification(
        {
          ...input,
          recipientId
        },
        client
      )
    )
  );
}

export async function notifyRoleUsers(
  roleCodes: string[],
  input: Omit<NotificationInput, "recipientId">,
  client: DbClient = prisma
) {
  const users = await client.user.findMany({
    where: {
      roleCode: {
        in: roleCodes as never[]
      },
      status: "active"
    },
    select: {
      id: true
    }
  });

  return notifyUsers(
    users.map((user) => user.id),
    input,
    client
  );
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
