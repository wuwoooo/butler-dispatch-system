import { pinyin } from "pinyin-pro";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

/** 根据姓名生成全小写拼音账号；重名时依次追加数字，避免要求业务人员手填账号。 */
export async function generateButlerUsername(
  name: string,
  client: DbClient = prisma
) {
  const base = pinyin(name, { toneType: "none", type: "array" })
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 56) || "butler";

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const username = suffix === 0 ? base : `${base}${suffix + 1}`;
    const exists = await client.user.findUnique({
      where: { username },
      select: { id: true }
    });
    if (!exists) return username;
  }

  throw new Error("无法生成唯一管家账号，请稍后重试");
}
