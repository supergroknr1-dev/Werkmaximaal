import { prisma } from "../../../../../lib/prisma";

export async function GET(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }
  const reacties = await prisma.reactie.findMany({
    where: { klusId },
    orderBy: { aangemaakt: "asc" },
  });
  return Response.json(reacties);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const data = await request.json();
  const naam = (data.naam ?? "").trim();
  const bericht = (data.bericht ?? "").trim();

  if (!naam || !bericht) {
    return Response.json(
      { error: "Naam en bericht zijn verplicht." },
      { status: 400 }
    );
  }

  const klusBestaat = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true },
  });
  if (!klusBestaat) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }

  const nieuw = await prisma.reactie.create({
    data: { klusId, naam, bericht },
  });
  return Response.json(nieuw);
}
