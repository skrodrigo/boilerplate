import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Reutiliza a instância em desenvolvimento
export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log:
			process.env.NODE_ENV === "development"
				? ["query", "info", "warn", "error"]
				: [],
	});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
