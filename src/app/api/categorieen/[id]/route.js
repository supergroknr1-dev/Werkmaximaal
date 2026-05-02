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
