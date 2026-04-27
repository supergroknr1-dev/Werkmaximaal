// Maak een bestaande user admin op basis van email.
// Gebruik: node --env-file=.env scripts/make-admin.mjs <email>

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Geef een e-mailadres mee: node ... make-admin.mjs <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Geen user gevonden met e-mail '${email}'.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });
  console.log(`✓ ${email} is nu admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
