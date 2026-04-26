import { prisma } from "../../../lib/prisma";

export async function GET() {
  const klussen = await prisma.klus.findMany({
    orderBy: { aangemaakt: "desc" },
  });
  return Response.json(klussen);
}

export async function POST(request) {
  const data = await request.json();
  const nieuweKlus = await prisma.klus.create({
    data: {
      titel: data.titel,
      beschrijving: data.beschrijving,
      plaats: data.plaats,
    },
  });
  return Response.json(nieuweKlus);
}