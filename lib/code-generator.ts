import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

function buildPaddedCode(prefix: string, index: number, width = 4) {
  return `${prefix}${String(index).padStart(width, "0")}`;
}

async function generateUniqueCode(
  exists: (code: string) => Promise<boolean>,
  prefix: string,
  width = 4
) {
  for (let index = 1; index <= 99999; index += 1) {
    const code = buildPaddedCode(prefix, index, width);
    if (!(await exists(code))) {
      return code;
    }
  }

  return `${prefix}${Date.now()}`;
}

export async function generateHotelCode(client: DbClient = prisma) {
  return generateUniqueCode(
    async (code) =>
      Boolean(
        await client.hotel.findUnique({
          where: { code },
          select: { id: true }
        })
      ),
    "HTL"
  );
}

export async function generateButlerCode(client: DbClient = prisma) {
  return generateUniqueCode(
    async (code) =>
      Boolean(
        await client.butler.findUnique({
          where: { code },
          select: { id: true }
        })
      ),
    "BTL"
  );
}

function normalizeCodePrefix(input: string) {
  const normalized = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return normalized.slice(0, 12) || "HTL";
}

export async function generateHotelRoomTypeCode(
  hotelId: string,
  hotelCode?: string | null,
  client: DbClient = prisma
) {
  const prefix = `${normalizeCodePrefix(hotelCode ?? "")}RT`;

  return generateUniqueCode(
    async (code) =>
      Boolean(
        await client.hotelRoomType.findFirst({
          where: {
            hotelId,
            code
          },
          select: { id: true }
        })
      ),
    prefix,
    3
  );
}
