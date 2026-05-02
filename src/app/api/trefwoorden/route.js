import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { emitActivity } from "../../../lib/events";

export async function GET() {
  const rows = await prisma.trefwoord.findMany({
    include: { categorieRef: true },
    orderBy: [{ categorieRef: { naam: "asc" } }, { woord: "asc" }],
  });
  // Behoud `categorie` als string in de response zodat clients ongewijzigd
  // blijven werken — interne kolom is nu een echte FK (categorieId).
  return Response.json(
    rows.map((t) => ({
      id: t.id,
      woord: t.woord,
      type: t.type,
      categorieId: t.categorieId,
      categorie: t.categorieRef.naam,
    }))
  );
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json();
  const categorieNaam = (data.categorie ?? "").trim();
  const type = data.type === "merk" ? "merk" : "zoekterm";

  if (!categorieNaam) {
    return Response.json(
      { error: "Categorie is verplicht." },
      { status: 400 }
    );
  }

  // Vind de categorie via naam (case-insensitive om historische input
  // te accepteren). FK garandeert verder dat we niet met spookbeeld-strings
  // kunnen werken.
  const cat = await prisma.categorie.findFirst({
    where: { naam: { equals: categorieNaam, mode: "insensitive" } },
  });
  if (!cat) {
    return Response.json(
      { error: `Categorie "${categorieNaam}" bestaat niet.` },
      { status: 400 }
    );
  }

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

  const toegevoegd = [];
  let bestaand = 0;
  for (const w of schoneWoorden) {
    const al = await prisma.trefwoord.findUnique({
      where: { categorieId_woord: { categorieId: cat.id, woord: w } },
    });
    if (al) {
      bestaand++;
      continue;
    }
    const nieuw = await prisma.trefwoord.create({
      data: { categorieId: cat.id, woord: w, type },
    });
    toegevoegd.push(nieuw);
  }

  if (toegevoegd.length > 0) {
    emitActivity({
      type:
        type === "merk"
          ? "trefwoord.merken_toegevoegd"
          : "trefwoord.zoektermen_toegevoegd",
      actor: { id: user.id, rol: "admin" },
      targetType: "categorie",
      targetId: cat.id,
      payload: {
        categorie: cat.naam,
        aantal: toegevoegd.length,
        woorden: toegevoegd.map((t) => t.woord),
      },
    });
  }

  return Response.json({
    toegevoegd,
    aantalToegevoegd: toegevoegd.length,
    aantalBestaand: bestaand,
  });
}
