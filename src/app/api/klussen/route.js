import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { getInstellingen } from "../../../lib/instellingen";

export async function GET() {
  const klussen = await prisma.klus.findMany({
    where: { gesloten: false, goedgekeurd: true },
    orderBy: { aangemaakt: "desc" },
  });
  return Response.json(klussen);
}

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json(
      { error: "U moet ingelogd zijn om een klus te plaatsen." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user) {
    session.destroy();
    return Response.json(
      { error: "Sessie is niet meer geldig. Log opnieuw in." },
      { status: 401 }
    );
  }
  if (user.rol !== "consument") {
    return Response.json(
      { error: "Alleen consumenten kunnen klussen plaatsen." },
      { status: 403 }
    );
  }

  const data = await request.json();
  let voorkeur = data.voorkeurVakmanType;
  if (voorkeur === "hobbyist") {
    const instellingen = await getInstellingen();
    if (!instellingen.hobbyistInschakeld) {
      return Response.json(
        { error: "Hobbyist-voorkeur is momenteel uitgeschakeld." },
        { status: 400 }
      );
    }
  }
  const nieuweKlus = await prisma.klus.create({
    data: {
      titel: data.titel,
      postcode: data.postcode || null,
      huisnummer: data.huisnummer || null,
      straatnaam: data.straatnaam || null,
      plaats: data.plaats,
      categorie: data.categorie || null,
      voorkeurVakmanType:
        voorkeur === "professional" || voorkeur === "hobbyist" ? voorkeur : null,
      userId: user.id,
    },
  });
  return Response.json(nieuweKlus);
}