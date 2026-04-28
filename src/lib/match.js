import { prisma } from "./prisma";

/**
 * Vind vakmannen wier werkgebied bij een klus past.
 *
 * Match-criteria (v1, geen geo-distance):
 * 1. Type-compatibiliteit:
 *    - klus.voorkeurVakmanType === null  → beide types matchen
 *    - klus.voorkeurVakmanType === 'professional' → alleen Pro
 *    - klus.voorkeurVakmanType === 'hobbyist'    → alleen Hobby
 * 2. Werkgebied (één van beide is genoeg):
 *    - vakman.regioPostcode (4 cijfers) match met de eerste 4 cijfers
 *      van klus.postcode (formaat 1234AB), OF
 *    - vakman.regioPlaats (case-insensitive trim) match met klus.plaats, OF
 *    - één van vakman's WerkgebiedExtra-rijen matcht op postcode of plaats
 *
 * Voor mooie geo-afstand (werkafstand in km) is een lat/lng-lookup
 * via PDOK + haversine nodig. Bewust later — dit dekt 80% van de
 * gevallen voor v1 zonder externe-API-calls per klus.
 *
 * @param {object} klus - { id, postcode, plaats, voorkeurVakmanType }
 * @returns {Promise<Array>} unieke vakmannen die kandidaat zijn voor de mail
 */
export async function vindMatchendeVakmannen(klus) {
  const klusPostcode4 = (klus.postcode || "").trim().slice(0, 4) || null;
  const klusPlaats = (klus.plaats || "").trim() || null;

  if (!klusPostcode4 && !klusPlaats) return [];

  // Type-filter
  const typeFilter = {};
  if (klus.voorkeurVakmanType === "professional") {
    typeFilter.vakmanType = "professional";
  } else if (klus.voorkeurVakmanType === "hobbyist") {
    typeFilter.vakmanType = "hobbyist";
  }
  // null = beide; geen extra filter

  // Een vakman matcht als zijn primair OF één van zijn extra werkgebieden
  // overlapt. We doen dat in één query met OR over de twee paden.
  const orChecks = [];
  if (klusPostcode4) {
    orChecks.push({ regioPostcode: klusPostcode4 });
    orChecks.push({
      werkgebiedenExtra: {
        some: { type: "postcode", waarde: klusPostcode4 },
      },
    });
  }
  if (klusPlaats) {
    orChecks.push({
      regioPlaats: { equals: klusPlaats, mode: "insensitive" },
    });
    orChecks.push({
      werkgebiedenExtra: {
        some: {
          type: "plaats",
          waarde: { equals: klusPlaats, mode: "insensitive" },
        },
      },
    });
  }

  if (orChecks.length === 0) return [];

  return prisma.user.findMany({
    where: {
      rol: "vakman",
      ...typeFilter,
      OR: orChecks,
    },
    select: {
      id: true,
      email: true,
      naam: true,
      bedrijfsnaam: true,
      vakmanType: true,
      regioPostcode: true,
      regioPlaats: true,
    },
  });
}
