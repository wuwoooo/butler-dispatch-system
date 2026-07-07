import { Prisma } from "@prisma/client";
import { accountPublicSelect, toAccountPublic } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";

export const butlerAccountDetailSelect = {
  id: true,
  name: true,
  phone: true,
  status: true,
  user: { select: accountPublicSelect }
} satisfies Prisma.ButlerSelect;

export type ButlerAccountDetail = Prisma.ButlerGetPayload<{
  select: typeof butlerAccountDetailSelect;
}>;

export async function findButlerAccountDetail(id: string) {
  return prisma.butler.findUnique({
    where: { id },
    select: butlerAccountDetailSelect
  });
}

export function toButlerAccountPublic(butler: ButlerAccountDetail) {
  return {
    ...butler,
    user: butler.user ? toAccountPublic(butler.user) : null
  };
}
