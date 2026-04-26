import { prisma } from "../../../lib/prisma";

export async function GET() {
  const trefwoorden = await prisma.trefwoord.findMany({
    orderBy: [{ categorie: "asc" }, { woord: "asc" }],
  });
  return Response.json(trefwoorden);
}

export async function POST(request) {
  const data = await request.json();
  const categorie = (data.categorie ?? "").trim();
  const woord = (data.woord ?? "").trim().toLowerCase();

  if (!categorie || !woord) {
    return Response.json(
      { error: "Categorie en woord zijn verplicht." },
      { status: 400 }
    );
  }

  try {
    const nieuw = await prisma.trefwoord.create({
      data: { categorie, woord },
    });
    return Response.json(nieuw);
  } catch (e) {
    if (e.code === "P2002") {
      return Response.json(
        { error: "Dit trefwoord bestaat al in deze categorie." },
        { status: 409 }
      );
    }
    throw e;
  }
}
