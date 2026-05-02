import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { emitActivity } from "../../../../lib/events";

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const categorieId = parseInt(id);

  const cat = await prisma.categorie.findUnique({
    where: { id: categorieId },
  });
  if (!cat) {
    return Response.json(
      { error: "Categorie niet gevonden." },
      { status: 404 }
    );
  }

  // Veiligheidscheck: blokkeren als er nog klussen of trefwoorden hangen.
  // Klus.categorie is nog een string (legacy) — case-insensitive match.
  // Trefwoord.categorieId is een echte FK.
  const [aantalKlussen, aantalTrefwoorden] = await Promise.all([
    prisma.klus.count({
      where: { categorie: { equals: cat.naam, mode: "insensitive" } },
    }),
    prisma.trefwoord.count({
      where: { categorieId: categorieId },
    }),
  ]);

  if (aantalKlussen > 0 || aantalTrefwoorden > 0) {
    const stukken = [];
    if (aantalKlussen > 0)
      stukken.push(`${aantalKlussen} klus${aantalKlussen === 1 ? "" : "sen"}`);
    if (aantalTrefwoorden > 0)
      stukken.push(
        `${aantalTrefwoorden} trefwoord${aantalTrefwoorden === 1 ? "" : "en"}`
      );
    return Response.json(
      {
        error: `Kan "${cat.naam}" niet verwijderen — er ${
          aantalKlussen + aantalTrefwoorden === 1 ? "is" : "zijn"
        } nog ${stukken.join(" en ")} aan gekoppeld. Verplaats of verwijder die eerst.`,
      },
      { status: 409 }
    );
  }

  await prisma.categorie.delete({ where: { id: categorieId } });

  emitActivity({
    type: "beroep.verwijderd",
    actor: { id: user.id, rol: "admin" },
    targetType: "categorie",
    targetId: categorieId,
    payload: { categorie: cat.naam },
  });

  return Response.json({ success: true });
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const categorieId = parseInt(id);
  const data = await request.json();
  const nieuweNaam = (data.naam ?? "").trim();

  if (!nieuweNaam) {
    return Response.json({ error: "Naam is verplicht." }, { status: 400 });
  }
  if (nieuweNaam.length > 60) {
    return Response.json(
      { error: "Naam mag maximaal 60 tekens zijn." },
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

  if (cat.naam === nieuweNaam) {
    return Response.json(cat); // No-op
  }

  // Block als nieuwe naam al bestaat (case-insensitive — voorkomt duplicaten
  // zoals "Loodgieter" / "loodgieter" naast elkaar).
  const conflict = await prisma.categorie.findFirst({
    where: {
      naam: { equals: nieuweNaam, mode: "insensitive" },
      NOT: { id: categorieId },
    },
  });
  if (conflict) {
    return Response.json(
      { error: `Categorie "${conflict.naam}" bestaat al.` },
      { status: 409 }
    );
  }

  // Transactie: rename Categorie + Klus.categorie (string-veld, legacy).
  // Trefwoord hoeft niet — die heeft een echte FK (categorieId) die
  // ongewijzigd blijft, dus de relatie loopt automatisch mee.
  const [updated] = await prisma.$transaction([
    prisma.categorie.update({
      where: { id: categorieId },
      data: { naam: nieuweNaam },
    }),
    prisma.klus.updateMany({
      where: { categorie: { equals: cat.naam, mode: "insensitive" } },
      data: { categorie: nieuweNaam },
    }),
  ]);

  emitActivity({
    type: "beroep.hernoemd",
    actor: { id: user.id, rol: "admin" },
    targetType: "categorie",
    targetId: categorieId,
    payload: { vorigeNaam: cat.naam, nieuweNaam },
  });

  return Response.json(updated);
}
