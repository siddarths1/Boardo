import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: databaseUrl(process.env.DATABASE_URL),
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
// Reuse the pool across bundled route modules in production as well as hot reloads.
globalForPrisma.prisma = prisma;
