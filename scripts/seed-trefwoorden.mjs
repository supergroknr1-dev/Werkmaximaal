// Seed/uitbreiding voor de Trefwoord-tabel — voegt 30+ matchwoorden
// per categorie toe. Idempotent: bestaande (categorie,woord)-combinaties
// worden geskipped dankzij @@unique([categorie, woord]).
//
// Gebruik: node --env-file=.env scripts/seed-trefwoorden.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Trefwoorden zijn lowercase; detectCategorie() doet input.toLowerCase()
// en .includes(woord), dus substrings matchen. Houd ze daarom uniek per
// categorie en zonder overlap met andere vakgebieden.
const TREFWOORDEN = {
  Elektricien: [
    "elektra", "kabel", "lamp", "schakelaar", "stopcontact", "stroom",
    "groepenkast", "groep aanmaken", "kortsluiting", "perilex", "meterkast",
    "bedrading", "thermostaat", "deurbel", "laadpaal", "zonnepanelen",
    "aardlek", "aardlekschakelaar", "buitenverlichting", "dimmer",
    "krachtstroom", "verlichting", "intercom", "tuinverlichting",
    "ledverlichting", "video deurbel", "inductie", "oven aansluiten",
    "droger aansluiten", "fornuis aansluiten", "slimme thermostaat",
    "kookplaat aansluiten", "data-kabel", "internet aansluiting",
  ],
  Loodgieter: [
    "buis", "douche", "kraan", "leiding", "lekkage", "verstopping", "wc",
    "wc aanleg", "gootsteen", "sanitair", "riool", "afvoer", "ontstopping",
    "badkamer", "toilet", "fontein", "mengkraan", "douchekop", "badkraan",
    "toiletpot", "wasbak", "regenpijp", "watermeter", "boiler", "geiser",
    "cv-ketel", "radiator", "vloerverwarming", "wasmachine aansluiten",
    "vaatwasser aansluiten", "sifon", "kraan vervangen", "spoelbak",
    "ketel installeren",
  ],
  Schilder: [
    "behang", "kwast", "muur", "plafond", "schilderen", "verf",
    "lakwerk", "beits", "buitenschilderwerk", "binnenschilderwerk",
    "kozijnen schilderen", "sauswerk", "latex", "primer", "grondverf",
    "glaswerk schilderen", "hekwerk schilderen", "garage schilderen",
    "schuurwerk", "behangen", "stucen", "stuc", "gipsen",
    "schoorsteen verven", "plafondschilderen", "schilderwerk", "verfwerk",
    "lakken", "rolluiken schilderen", "muurverf", "plafondverf",
  ],
  Klusjesman: [
    "monteren", "ophangen", "schroef", "montage", "ikea", "samenstellen",
    "plank", "hangen", "vastzetten", "gat boren", "beugel", "gipsplaat",
    "klusjes", "klein onderhoud", "in elkaar zetten", "slot vervangen",
    "klein klusje", "opbouw meubel", "kast in elkaar zetten",
    "kast samenstellen", "gordijnrails", "ophangsysteem", "deur afhangen",
    "deurbeslag", "raambeslag", "scharnier", "wandbeugel", "plankdrager",
    "tv aan de muur", "schilderij ophangen", "spiegel ophangen",
    "boekenkast monteren", "kapstok ophangen",
  ],
  Tuinman: [
    "snoeien", "hagen", "gras maaien", "gazon", "tuinaanleg", "beplanting",
    "gazon aanleggen", "schutting plaatsen", "schutting", "terras aanleggen",
    "vijver aanleggen", "grond afgraven", "boomverzorging", "boom rooien",
    "struiken snoeien", "heg knippen", "hagen knippen", "onkruid wieden",
    "takken weghalen", "grasveld", "bemesting", "tuinhuis bouwen",
    "vlonder", "beregening", "tuin", "planten", "border", "siertuin",
    "moestuin", "kas plaatsen", "kunstgras", "trampoline plaatsen",
    "boomstronk",
  ],
  Timmerman: [
    "kozijn", "raam vervangen", "deurkozijn", "plafondbalken", "vloer leggen",
    "parket", "laminaat", "houtwerk", "dakconstructie", "trap maken",
    "traprenovatie", "dakkapel bouwen", "balkon hout", "schutting hout",
    "pergola", "terras hout", "vlonder hout", "schroten", "houten plafond",
    "houten vloer", "binnendeur", "buitendeur", "deuren plaatsen",
    "kasten op maat", "inbouwkast", "raamkozijn", "houtreparatie",
    "houtrot", "balkenplafond", "trapleuning", "houten trap",
    "schuur bouwen", "tuinhuis hout",
  ],
  Stratenmaker: [
    "bestrating", "oprit", "stoep", "tegel", "klinkers", "tegels leggen",
    "terrastegels", "opritstenen", "betonbestrating", "oprit aanleggen",
    "garagepad", "opsluitbanden", "tuintegels", "sierbestrating", "tuinpad",
    "betonklinkers", "gebakken klinkers", "terras leggen", "oprit verbreden",
    "drempel verlagen", "herstraten", "opnieuw bestraten", "voegwerk straat",
    "infiltratiekratten", "verharding", "patio aanleggen", "fietspad",
    "kantopsluiting", "trottoir", "stoeptegels", "parkeervak",
    "drainage straat", "natuursteen leggen", "pad aanleggen",
  ],
};

async function main() {
  let nieuw = 0;

  for (const [categorie, woorden] of Object.entries(TREFWOORDEN)) {
    for (const woord of woorden) {
      const w = woord.toLowerCase().trim();
      const bestond = await prisma.trefwoord.findUnique({
        where: { categorie_woord: { categorie, woord: w } },
      });
      if (!bestond) {
        await prisma.trefwoord.create({ data: { categorie, woord: w } });
        nieuw++;
      }
    }
  }

  const totaal = await prisma.trefwoord.groupBy({
    by: ["categorie"],
    _count: true,
    orderBy: { categorie: "asc" },
  });
  console.log(`\n✓ ${nieuw} nieuwe trefwoorden toegevoegd.\n`);
  console.log("Totaal per categorie:");
  for (const t of totaal) {
    console.log(`  ${t.categorie}: ${t._count}`);
  }
  console.log(
    `\nTotaal: ${totaal.reduce((s, t) => s + t._count, 0)} trefwoorden.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
