import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { gitaVerses } from "../src/data/gitaVerses";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function clearDatabase() {
  console.log("🗑️  Clearing existing data...");
  await prisma.user.deleteMany();
  await prisma.gitaVerse.deleteMany()

  console.log("✅ Cleared existing data");
}
