import { prisma } from "./prisma";

/**
 * Geeft per vakman-userId een object { gemiddelde, aantal } terug.
 * Vakmannen zonder reviews komen niet voor in de map. Eén DB-query
 * voor alle gevraagde IDs samen.
 */
export async function getVakmanScores(userIds) {
  const unieke = [...new Set(userIds.filter((id) => Number.isInteger(id)))];
  if (unieke.length === 0) return new Map();

  // Reviews zijn gekoppeld aan een Lead, en de Lead bepaalt welke vakman.
  // We groeperen via de raw aggregation op leadId → vakmanId.
  const reviews = await prisma.review.findMany({
    where: { lead: { vakmanId: { in: unieke } } },
    select: { score: true, lead: { select: { vakmanId: true } } },
  });

  const map = new Map();
  for (const r of reviews) {
    const id = r.lead.vakmanId;
    const huidig = map.get(id) || { som: 0, aantal: 0 };
    huidig.som += r.score;
    huidig.aantal += 1;
    map.set(id, huidig);
  }
  const resultaat = new Map();
  for (const [id, { som, aantal }] of map) {
    resultaat.set(id, { gemiddelde: som / aantal, aantal });
  }
  return resultaat;
}
