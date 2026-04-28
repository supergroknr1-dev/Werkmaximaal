import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  select: { id: true, email: true, naam: true, rol: true, isAdmin: true, vakmanType: true },
  orderBy: { id: "asc" },
});
const klusCount = await prisma.klus.count();
const leadCount = await prisma.lead.count();
console.log(JSON.stringify({ users, klusCount, leadCount }, null, 2));
await prisma.$disconnect();
