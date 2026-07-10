import type { Prisma, PrismaClient } from "@prisma/client";
import {
  defaultBusinessDictItems,
  type EditableBusinessDictType
} from "@/lib/business-config";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function ensureDefaultBusinessDicts(client: DbClient = prisma) {
  await Promise.all(
    defaultBusinessDictItems.map((item) =>
      client.systemDict.upsert({
        where: {
          dictType_value: {
            dictType: item.dictType,
            value: item.value
          }
        },
        update: {},
        create: {
          dictType: item.dictType,
          label: item.label,
          value: item.value,
          sort: item.sort,
          enabled: true
        }
      })
    )
  );
}

export async function getEnabledBusinessDictItems(
  dictType: EditableBusinessDictType,
  client: DbClient = prisma
) {
  await ensureDefaultBusinessDicts(client);

  return client.systemDict.findMany({
    where: {
      dictType,
      enabled: true
    },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      dictType: true,
      label: true,
      value: true,
      sort: true
    }
  });
}

export async function isEnabledBusinessDictValue(
  dictType: EditableBusinessDictType,
  value: string,
  client: DbClient = prisma
) {
  await ensureDefaultBusinessDicts(client);

  const count = await client.systemDict.count({
    where: {
      dictType,
      value,
      enabled: true
    }
  });

  return count > 0;
}
