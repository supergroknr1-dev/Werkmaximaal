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
  const naam = (data.naam ?? "").trim();

  if (!naam) {
    return Response.json(
      { error: "Naam is verplicht." },
      { status: 400 }
    );
  }
  if (naam.length > 60) {
    return Response.json(
      { error: "Naam mag maximaal 60 tekens zijn." },
      { status: 400 }
    );
  }

  const bestaand = await prisma.categorie.findUnique({ where: { naam } });
  if (bestaand) {
    return Response.json(
      { error: `Categorie "${naam}" bestaat al.` },
      { status: 409 }
    );
  }

  const nieuw = await prisma.categorie.create({ data: { naam } });
  return Response.json(nieuw);
}
