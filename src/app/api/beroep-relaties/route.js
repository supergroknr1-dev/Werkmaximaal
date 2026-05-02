import { prisma } from "../../../lib/prisma";

// Public read-only: gegeven een beroep-naam, geef de gerelateerde
// cross-sell suggestie terug (als die bestaat). Gebruikt door de
// klus-form om een notice te tonen na keuze van categorie.
export async function GET(request) {
  const url = new URL(request.url);
  const categorie = url.searchParams.get("categorie");
  if (!categorie) {
    return Response.json({ relatie: null });
  }

  const cat = await prisma.categorie.findFirst({
    where: { naam: { equals: categorie, mode: "insensitive" } },
    include: {
      primaireRelaties: {
        include: { gerelateerdeRef: true },
        take: 1,
      },
    },
  });
  if (!cat || cat.primaireRelaties.length === 0) {
    return Response.json({ relatie: null });
  }

  const r = cat.primaireRelaties[0];
  return Response.json({
    relatie: {
      gerelateerdeNaam: r.gerelateerdeRef.naam,
      uitleg: r.uitleg,
    },
  });
}
