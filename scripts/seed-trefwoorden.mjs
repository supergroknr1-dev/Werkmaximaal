// Eenmalig draaien om de huidige trefwoorden in de DB te zetten.
// node --env-file=.env scripts/seed-trefwoorden.mjs
//
// Gebruikt upsert zodat opnieuw draaien geen dubbele rijen oplevert.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TREFWOORDEN = {
  Tuinman: ["boom", "heg", "tuin", "gras", "snoeien", "plant", "haag"],
  Schilder: ["verf", "muur", "schilderen", "kwast", "behang", "plafond"],
  Loodgieter: ["leiding", "kraan", "lekkage", "wc", "douche", "buis", "verstopping"],
  Elektricien: ["stopcontact", "kabel", "stroom", "lamp", "elektra", "schakelaar"],
  Timmerman: ["hout", "deur", "kast", "vloer", "raam"],
  Stratenmaker: ["tegel", "stoep", "oprit", "bestrating"],
  Klusjesman: ["ophangen", "monteren", "schroef"],
};

async function main() {
  let toegevoegd = 0;
  let bestond_al = 0;

  for (const [categorie, woorden] of Object.entries(TREFWOORDEN)) {
    for (const woord of woorden) {
      const result = await prisma.trefwoord.upsert({
        where: { categorie_woord: { categorie, woord } },
        create: { categorie, woord },
        update: {},
      });
      if (result.id) toegevoegd++; // upsert always returns the row; we count all
    }
  }

  const totaal = await prisma.trefwoord.count();
  console.log(`Klaar. Trefwoorden in DB: ${totaal}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
