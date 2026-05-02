import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { emitActivity } from "../../../lib/events";

export async function GET() {
  const categorieen = await prisma.categorie.findMany({
    orderBy: [{ volgorde: "asc" }, { naam: "asc" }],
  });
  return Response.json(categorieen);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json();

  // Accepteer ofwel `naam` (single) of `namen` (array). De multi-input
  // in /beheer splitst op komma's of newlines en stuurt het als array.
  let inputNamen = [];
  if (Array.isArray(data.namen)) {
    inputNamen = data.namen;
  } else if (typeof data.naam === "string") {
    inputNamen = [data.naam];
  }

  // Trim, dedupe (case-insensitive), filter lege strings en cap op 60 tekens.
  const seen = new Set();
  const schoneNamen = [];
  for (const raw of inputNamen) {
    if (typeof raw !== "string") continue;
    const naam = raw.trim();
    if (!naam) continue;
    if (naam.length > 60) {
      return Response.json(
        { error: `"${naam.slice(0, 30)}..." is te lang (max 60 tekens).` },
        { status: 400 }
      );
    }
    const key = naam.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    schoneNamen.push(naam);
  }

  if (schoneNamen.length === 0) {
    return Response.json(
      { error: "Geef minimaal één beroep op." },
      { status: 400 }
    );
  }

  // Bulk insert via createMany + skipDuplicates — één DB-roundtrip.
  const result = await prisma.categorie.createMany({
    data: schoneNamen.map((naam) => ({ naam })),
    skipDuplicates: true,
  });
  const aantalToegevoegd = result.count;
  const aantalBestaand = schoneNamen.length - aantalToegevoegd;

  if (aantalToegevoegd > 0) {
    // Pak de net-aangemaakte rijen voor het event (createMany geeft ze
    // niet terug — handig om dit los te doen, blijft één extra query).
    const verseRijen = await prisma.categorie.findMany({
      where: { naam: { in: schoneNamen } },
      orderBy: { id: "desc" },
      take: aantalToegevoegd,
    });
    emitActivity({
      type: "beroep.toegevoegd",
      actor: { id: user.id, rol: "admin" },
      targetType: "categorie",
      targetId: verseRijen[0]?.id ?? null,
      payload: {
        aantal: aantalToegevoegd,
        namen: verseRijen.map((c) => c.naam),
      },
    });
  }

  return Response.json({
    aantalToegevoegd,
    aantalBestaand,
  });
}
