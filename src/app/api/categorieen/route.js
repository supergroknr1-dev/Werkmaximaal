import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

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

  // Idempotent insert — bestaande naam blijft staan, geen fout.
  const toegevoegd = [];
  let bestaand = 0;
  for (const naam of schoneNamen) {
    const al = await prisma.categorie.findUnique({ where: { naam } });
    if (al) {
      bestaand++;
      continue;
    }
    const nieuw = await prisma.categorie.create({ data: { naam } });
    toegevoegd.push(nieuw);
  }

  return Response.json({
    toegevoegd,
    aantalToegevoegd: toegevoegd.length,
    aantalBestaand: bestaand,
  });
}
