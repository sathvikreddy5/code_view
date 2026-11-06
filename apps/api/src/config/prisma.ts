import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  console.log("PostgreSQL connected successfully.");
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  console.log("PostgreSQL disconnected.");
}
