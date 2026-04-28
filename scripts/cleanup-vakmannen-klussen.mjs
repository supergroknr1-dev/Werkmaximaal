import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

console.log("--- VOOR ---");
console.log({
  klussen: await prisma.klus.count(),
  reacties: await prisma.reactie.count(),
  leads: await prisma.lead.count(),
  reviews: await prisma.review.count(),
  werkgebiedenExtra: await prisma.werkgebiedExtra.count(),
  vakmannen: await prisma.user.count({ where: { rol: "vakman" } }),
});

// Klussen verwijderen → cascade'd naar Reactie + Lead + Review-via-Lead
const klusDel = await prisma.klus.deleteMany({});
console.log(`klussen verwijderd: ${klusDel.count}`);

// Resterende reviews die niet via lead-cascade weg zijn (zou 0 moeten zijn,
// want Review hangt aan Lead, en Lead hangt aan Klus)
const reviewDel = await prisma.review.deleteMany({});
console.log(`reviews verwijderd (rest): ${reviewDel.count}`);

// Vakmannen verwijderen → cascade'd naar WerkgebiedExtra + resterende leads
const vakmanDel = await prisma.user.deleteMany({ where: { rol: "vakman" } });
console.log(`vakmannen verwijderd: ${vakmanDel.count}`);

console.log("--- NA ---");
console.log({
  klussen: await prisma.klus.count(),
  reacties: await prisma.reactie.count(),
  leads: await prisma.lead.count(),
  reviews: await prisma.review.count(),
  werkgebiedenExtra: await prisma.werkgebiedExtra.count(),
  vakmannen: await prisma.user.count({ where: { rol: "vakman" } }),
  consumenten: await prisma.user.count({ where: { rol: "consument" } }),
  admins: await prisma.user.count({ where: { isAdmin: true } }),
});

await prisma.$disconnect();
