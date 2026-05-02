import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

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
  const [aantalKlussen, aantalTrefwoorden] = await Promise.all([
    prisma.klus.count({
      where: { categorie: { equals: cat.naam, mode: "insensitive" } },
    }),
    prisma.trefwoord.count({
      where: { categorie: cat.naam },
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

  // Transactie: rename Categorie + bijbehorende Trefwoord-rijen + Klus-rijen
  // zodat string-referenties consistent blijven. Klus is case-insensitive
  // (matcht historische data); Trefwoord matcht exact (we zetten zelf de
  // hoofdletter).
  const [updated] = await prisma.$transaction([
    prisma.categorie.update({
      where: { id: categorieId },
      data: { naam: nieuweNaam },
    }),
    prisma.trefwoord.updateMany({
      where: { categorie: cat.naam },
      data: { categorie: nieuweNaam },
    }),
    prisma.klus.updateMany({
      where: { categorie: { equals: cat.naam, mode: "insensitive" } },
      data: { categorie: nieuweNaam },
    }),
  ]);

  return Response.json(updated);
}
