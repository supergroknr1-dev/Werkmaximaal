import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED = [
  "Schilder",
  "Loodgieter",
  "Klusjesman",
  "Tuinman",
  "Elektricien",
  "Timmerman",
  "Stratenmaker",
  "Anders",
];

async function main() {
  let toegevoegd = 0;
  let bestaand = 0;
  for (const naam of SEED) {
    try {
      await prisma.categorie.create({ data: { naam } });
      toegevoegd++;
    } catch (e) {
      if (e.code === "P2002") bestaand++;
      else throw e;
    }
  }
  console.log(`✓ ${toegevoegd} toegevoegd, ${bestaand} bestond al`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
