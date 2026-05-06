import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7.x generated types require `adapter` or `accelerateUrl` in PrismaClientOptions,
// but when using standard DATABASE_URL connection (configured in prisma.config.ts),
// neither is required at runtime. This is a known Prisma 7 type definition issue.
export const prisma =
  globalForPrisma.prisma ??
  // @ts-expect-error - Prisma 7.x type definitions incorrectly require adapter/accelerateUrl
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
