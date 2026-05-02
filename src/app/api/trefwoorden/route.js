import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

export async function GET() {
  const trefwoorden = await prisma.trefwoord.findMany({
    orderBy: [{ categorie: "asc" }, { woord: "asc" }],
  });
  return Response.json(trefwoorden);
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json();
  const categorie = (data.categorie ?? "").trim();
  const type = data.type === "merk" ? "merk" : "zoekterm";

  if (!categorie) {
    return Response.json({ error: "Categorie is verplicht." }, { status: 400 });
  }

  // Accepteer ofwel `woord` (single) of `woorden` (array). De multi-input
  // in /beheer splitst op komma's of newlines en stuurt het als array.
  let inputWoorden = [];
  if (Array.isArray(data.woorden)) {
    inputWoorden = data.woorden;
  } else if (typeof data.woord === "string") {
    inputWoorden = [data.woord];
  }

  const schoneWoorden = [
    ...new Set(
      inputWoorden
        .map((w) => (typeof w === "string" ? w.trim().toLowerCase() : ""))
        .filter(Boolean)
    ),
  ];

  if (schoneWoorden.length === 0) {
    return Response.json(
      { error: "Geef minimaal één trefwoord op." },
      { status: 400 }
    );
  }

  // Idempotent insert via upsert — bestaande (categorie,woord) blijft
  // staan en wordt niet als fout gemeld.
  const toegevoegd = [];
  let bestaand = 0;
  for (const w of schoneWoorden) {
    const al = await prisma.trefwoord.findUnique({
      where: { categorie_woord: { categorie, woord: w } },
    });
    if (al) {
      bestaand++;
      continue;
    }
    const nieuw = await prisma.trefwoord.create({
      data: { categorie, woord: w, type },
    });
    toegevoegd.push(nieuw);
  }

  return Response.json({
    toegevoegd,
    aantalToegevoegd: toegevoegd.length,
    aantalBestaand: bestaand,
  });
}
