import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { emitActivity } from "../../../../lib/events";

// Bulk-wipe van trefwoorden voor één beroep, optioneel gefilterd op type
// (alleen zoektermen of alleen merken). Vereist admin + WISSEN-bevestiging
// op de client.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json();
  const categorieId = parseInt(data.categorieId);
  const type =
    data.type === "merk" || data.type === "zoekterm" ? data.type : null;

  if (!categorieId) {
    return Response.json(
      { error: "categorieId is verplicht." },
      { status: 400 }
    );
  }

  const cat = await prisma.categorie.findUnique({
    where: { id: categorieId },
  });
  if (!cat) {
    return Response.json(
      { error: "Categorie niet gevonden." },
      { status: 404 }
    );
  }

  const where = { categorieId };
  if (type) where.type = type;

  const result = await prisma.trefwoord.deleteMany({ where });

  emitActivity({
    type:
      type === "merk"
        ? "trefwoord.merken_bulk_verwijderd"
        : type === "zoekterm"
        ? "trefwoord.zoektermen_bulk_verwijderd"
        : "trefwoord.alles_bulk_verwijderd",
    actor: { id: user.id, rol: "admin" },
    targetType: "categorie",
    targetId: categorieId,
    payload: {
      categorie: cat.naam,
      aantalVerwijderd: result.count,
      typeFilter: type || "alles",
    },
  });

  return Response.json({ aantalVerwijderd: result.count });
}
