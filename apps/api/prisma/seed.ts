import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { questions } from "@pkg/shared";

dotenv.config();

import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.question.count();
  if (existing > 0) {
    console.log(`Questions already exist (${existing}), skipping seed.`);
    return;
  }

  await prisma.question.createMany({
    data: questions.map((q) => ({
      topic: q.topic,
      text: q.question,
      answer: q.answer,
      difficulty: 1,
      tags: [],
    })),
  });

  const after = await prisma.question.count();
  console.log(`Seeded questions: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
