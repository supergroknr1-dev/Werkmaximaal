// Importeer beroepen + zoektermen vanuit een Excel met "Long format"-tab
// (kolommen: Beroep, Zoekterm).
//
// Idempotent:
//   - Ontbrekende beroepen worden aangemaakt in Categorie-tabel
//   - Bestaande (categorieId, woord) worden geskipped via createMany skipDuplicates
//
// Gebruik: node --env-file=.env scripts/import-excel.mjs
//
// Pas EXCEL_PATH aan naar een andere file. De file mag NIET in git staan
// (privé data). Het script zelf is wel gecommit als referentie.

import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const EXCEL_PATH = "C:/Users/Buitenglas.nl/Desktop/Zoektermen/Dienste beroepen.xlsx";

const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const longTab = wb.SheetNames.find((n) => /long/i.test(n));
  if (!longTab) {
    console.error("Geen 'long format'-tab gevonden in Excel.");
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[longTab], { defval: "" });
  console.log(`📊 ${rows.length} rijen gelezen uit "${longTab}".`);

  // Groepeer per beroep. Trim en filter lege zoektermen.
  const perBeroep = {};
  for (const r of rows) {
    const beroep = String(r.Beroep || "").trim();
    const woord = String(r.Zoekterm || "").trim().toLowerCase();
    if (!beroep || !woord) continue;
    if (!perBeroep[beroep]) perBeroep[beroep] = new Set();
    perBeroep[beroep].add(woord);
  }
  const beroepNamen = Object.keys(perBeroep).sort();
  console.log(`📁 ${beroepNamen.length} unieke beroepen:`);
  for (const b of beroepNamen) {
    console.log(`   - ${b}: ${perBeroep[b].size} zoektermen`);
  }

  // Stap 1: zorg dat alle beroepen bestaan in Categorie.
  const bestaande = await prisma.categorie.findMany();
  const naarId = Object.fromEntries(bestaande.map((c) => [c.naam, c.id]));
  const ontbreekt = beroepNamen.filter((n) => !naarId[n]);
  if (ontbreekt.length > 0) {
    console.log(`\n➕ ${ontbreekt.length} nieuwe beroepen toevoegen aan Categorie-tabel...`);
    await prisma.categorie.createMany({
      data: ontbreekt.map((naam) => ({ naam })),
      skipDuplicates: true,
    });
    const ververst = await prisma.categorie.findMany();
    for (const c of ververst) naarId[c.naam] = c.id;
  }

  // Stap 2: bulk-insert per beroep.
  console.log(`\n💾 Bulk-import zoektermen...`);
  let totaalToegevoegd = 0;
  let totaalGeskipped = 0;
  for (const beroep of beroepNamen) {
    const categorieId = naarId[beroep];
    const woorden = [...perBeroep[beroep]];
    const result = await prisma.trefwoord.createMany({
      data: woorden.map((woord) => ({ categorieId, woord, type: "zoekterm" })),
      skipDuplicates: true,
    });
    const toegevoegd = result.count;
    const geskipped = woorden.length - toegevoegd;
    totaalToegevoegd += toegevoegd;
    totaalGeskipped += geskipped;
    console.log(
      `   ${beroep.padEnd(40)} +${toegevoegd}${geskipped ? ` (${geskipped} bestond al)` : ""}`
    );
  }

  console.log(
    `\n✅ Klaar — ${totaalToegevoegd} nieuwe trefwoorden, ${totaalGeskipped} bestonden al, ${beroepNamen.length} beroepen verwerkt.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Import mislukt:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
