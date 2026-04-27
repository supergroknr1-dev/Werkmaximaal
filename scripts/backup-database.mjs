// Lokale JSON-backup van de Werkmaximaal Postgres-database (Railway).
// Maakt per tabel een JSON-bestand aan in backups/<timestamp>/ plus
// een manifest.json met tellingen.
//
// Gebruik:
//   cd D:\test-werkspot-website
//   node --env-file=.env scripts/backup-database.mjs
//
// Tip: draai dit voordat je een migratie doet of voordat je iets in
// admin gaat opruimen. Backup-mappen zijn lokaal en worden niet naar
// GitHub gepusht (zie .gitignore).

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Volgorde maakt voor backup niet uit, maar zo is het lekker leesbaar.
const TABELLEN = [
  { naam: "User", query: () => prisma.user.findMany() },
  { naam: "Setting", query: () => prisma.setting.findMany() },
  { naam: "Trefwoord", query: () => prisma.trefwoord.findMany() },
  { naam: "Klus", query: () => prisma.klus.findMany() },
  {
    naam: "WachtwoordResetToken",
    query: () => prisma.wachtwoordResetToken.findMany(),
  },
  { naam: "Reactie", query: () => prisma.reactie.findMany() },
  { naam: "Lead", query: () => prisma.lead.findMany() },
];

function veiligeTimestamp() {
  // ISO zonder dubbele punten (Windows-bestandsnaam-vriendelijk)
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const stamp = veiligeTimestamp();
  const doelmap = path.resolve("backups", stamp);
  fs.mkdirSync(doelmap, { recursive: true });

  console.log(`\n📦 Backup gestart → ${doelmap}\n`);

  const manifest = {
    aangemaakt: new Date().toISOString(),
    database: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@") ?? "?",
    tabellen: {},
  };

  for (const t of TABELLEN) {
    process.stdout.write(`  ${t.naam.padEnd(22)} ... `);
    const rijen = await t.query();
    const bestand = path.join(doelmap, `${t.naam}.json`);
    fs.writeFileSync(bestand, JSON.stringify(rijen, null, 2));
    manifest.tabellen[t.naam] = rijen.length;
    console.log(`${rijen.length} rij${rijen.length === 1 ? "" : "en"}`);
  }

  fs.writeFileSync(
    path.join(doelmap, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  const totaal = Object.values(manifest.tabellen).reduce((s, n) => s + n, 0);
  console.log(`\n✅ Klaar — ${totaal} rijen in totaal opgeslagen.\n`);
  console.log(`Locatie: ${doelmap}`);
  console.log(
    `Restore: node --env-file=.env scripts/restore-database.mjs "${doelmap}" --confirm\n`
  );
}

main()
  .catch((e) => {
    console.error("❌ Backup mislukt:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
