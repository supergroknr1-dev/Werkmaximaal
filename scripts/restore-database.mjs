// Restore van een eerder gemaakte JSON-backup (zie backup-database.mjs).
// Werkt idempotent met upsert op id, dus rijen die nog bestaan worden
// bijgewerkt en ontbrekende worden toegevoegd. Hij verwijdert NIETS —
// als je echt schoon wilt herstellen, leeg je de tabellen eerst zelf
// via Prisma Studio of een SQL-tool.
//
// Gebruik:
//   node --env-file=.env scripts/restore-database.mjs "<pad naar backup-map>" --confirm
//
// Voorbeeld:
//   node --env-file=.env scripts/restore-database.mjs ^
//        "backups/2026-04-27T20-15-32-001Z" --confirm

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Volgorde is belangrijk: ouders vóór kinderen vanwege foreign keys.
const VOLGORDE = [
  "User",
  "Setting",
  "Trefwoord",
  "Klus",
  "WachtwoordResetToken",
  "Reactie",
  "Lead",
];

const MODEL = {
  User: prisma.user,
  Setting: prisma.setting,
  Trefwoord: prisma.trefwoord,
  Klus: prisma.klus,
  WachtwoordResetToken: prisma.wachtwoordResetToken,
  Reactie: prisma.reactie,
  Lead: prisma.lead,
};

function parseDates(rij) {
  // JSON heeft datums als strings opgeslagen; Prisma wil Date-objecten.
  const datumVelden = [
    "aangemaakt",
    "vervaltOp",
    "gekochtOp",
    "createdAt",
    "updatedAt",
  ];
  const kopie = { ...rij };
  for (const v of datumVelden) {
    if (typeof kopie[v] === "string") kopie[v] = new Date(kopie[v]);
  }
  return kopie;
}

async function main() {
  const args = process.argv.slice(2);
  const map = args.find((a) => !a.startsWith("--"));
  const confirm = args.includes("--confirm");

  if (!map) {
    console.error(
      "Geef een backup-map mee, bv. backups/2026-04-27T20-15-32-001Z"
    );
    process.exit(1);
  }
  if (!confirm) {
    console.error(
      "❌ Restore is destructief voor bestaande rijen met dezelfde id.\n" +
        "   Voeg --confirm toe om door te gaan."
    );
    process.exit(1);
  }
  if (!fs.existsSync(map)) {
    console.error(`Map niet gevonden: ${map}`);
    process.exit(1);
  }

  console.log(`\n♻️  Restore vanuit ${map}\n`);

  for (const naam of VOLGORDE) {
    const bestand = path.join(map, `${naam}.json`);
    if (!fs.existsSync(bestand)) {
      console.log(`  ${naam.padEnd(22)} ... overgeslagen (geen JSON)`);
      continue;
    }
    const rijen = JSON.parse(fs.readFileSync(bestand, "utf-8"));
    process.stdout.write(`  ${naam.padEnd(22)} ... `);
    let teller = 0;
    for (const rij of rijen) {
      const data = parseDates(rij);
      await MODEL[naam].upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
      teller++;
    }
    console.log(`${teller} rij${teller === 1 ? "" : "en"} hersteld`);
  }

  console.log("\n✅ Restore voltooid.\n");
}

main()
  .catch((e) => {
    console.error("❌ Restore mislukt:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
