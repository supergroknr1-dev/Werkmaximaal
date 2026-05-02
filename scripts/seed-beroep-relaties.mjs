// Cross-sell config: welke beroepen worden vaak samen gevraagd.
// Idempotent: bestaande (primaire, gerelateerde) blijft staan.
//
// Gebruik: node --env-file=.env scripts/seed-beroep-relaties.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Format: [primair, gerelateerd, uitleg]
// "uitleg" wordt op de notice op de klus-form getoond.
const RELATIES = [
  // Afwerking-flow
  ["Schilder", "Stukadoor", "Voor een glad eindresultaat wordt de muur eerst gestuukt en daarna geverfd."],
  ["Stukadoor", "Schilder", "Na het stucen wil je vaak ook de muren laten schilderen."],

  // Elektriciteit + handwerk
  ["Klusjesman / handyman", "Elektricien", "Bij ophangen van lampen of installatie van apparaten is een elektricien soms nodig voor de bedrading."],
  ["Elektricien", "Klusjesman / handyman", "Voor het ophangen of bevestigen van armaturen kan een klusjesman handig zijn naast de elektrische aansluiting."],

  // Badkamer-cluster
  ["Loodgieter", "Tegelzetter", "Bij badkamerwerkzaamheden zijn vaak ook tegels en voegen nodig."],
  ["Tegelzetter", "Loodgieter", "Voor leidingwerk of afvoer onder de tegels heb je een loodgieter nodig."],
  ["Tegelzetter", "Voeger", "Na het tegelen volgen vaak nog de voegen voor een volledig afgewerkt geheel."],

  // CV / Verwarming
  ["CV-/installateur", "Loodgieter", "Sommige radiator- of leidingwerkzaamheden vereisen ook een loodgieter."],

  // Tuin & buiten
  ["Hovenier", "Stratenmaker", "Bij tuinaanleg horen vaak ook bestrating en paden."],
  ["Stratenmaker", "Hovenier", "Een nieuwe oprit of terras vraagt vaak ook om tuininrichting."],

  // Dak & gevel
  ["Dakdekker", "Gevelspecialist", "Bij dakwerkzaamheden komt soms ook gevelreiniging of -reparatie kijken."],
  ["Gevelspecialist", "Voeger", "Gevelrenovatie en voegwerk gaan vaak hand-in-hand."],

  // Verbouwing
  ["Aannemer", "Schilder", "Na een verbouwing wil je de muren en kozijnen vaak ook laten schilderen."],
  ["Aannemer", "Tegelzetter", "Bij keuken- of badkamerverbouwingen heb je doorgaans ook een tegelzetter nodig."],

  // Ramen & isolatie
  ["Glaszetter", "Kozijnenspecialist", "Bij vervanging van ruiten zijn nieuwe of opgeknapte kozijnen soms passend."],
  ["Isolatiespecialist", "Glaszetter", "Voor optimale isolatie wil je vaak ook isolatieglas in de bestaande kozijnen."],

  // Behang & vloer
  ["Behanger", "Schilder", "Bij behangen wil je het plafond of de plinten ook vaak laten schilderen."],
  ["Vloerlegger", "Stoffeerder / interieur", "Een nieuwe vloer combineer je vaak met nieuwe gordijnen of stoffering."],
];

async function main() {
  const cats = await prisma.categorie.findMany();
  const naarId = Object.fromEntries(cats.map((c) => [c.naam, c.id]));

  let toegevoegd = 0;
  let bestaand = 0;
  let onbekend = 0;

  for (const [primair, gerelateerd, uitleg] of RELATIES) {
    const primaireId = naarId[primair];
    const gerelateerdeId = naarId[gerelateerd];
    if (!primaireId) {
      console.warn(`! Primair beroep "${primair}" niet gevonden — overgeslagen.`);
      onbekend++;
      continue;
    }
    if (!gerelateerdeId) {
      console.warn(`! Gerelateerd beroep "${gerelateerd}" niet gevonden — overgeslagen.`);
      onbekend++;
      continue;
    }
    try {
      await prisma.beroepRelatie.create({
        data: { primaireId, gerelateerdeId, uitleg },
      });
      toegevoegd++;
    } catch (e) {
      if (e.code === "P2002") bestaand++;
      else throw e;
    }
  }

  console.log(
    `✓ ${toegevoegd} relaties toegevoegd, ${bestaand} bestond al, ${onbekend} onbekende beroepen.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed mislukt:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
