import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";

export async function POST(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true, userId: true, gesloten: true },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }
  if (klus.userId !== session.userId) {
    return Response.json({ error: "Geen toestemming." }, { status: 403 });
  }

  const data = await request.json().catch(() => ({}));
  const nieuweStatus =
    typeof data.gesloten === "boolean" ? data.gesloten : !klus.gesloten;

  const bijgewerkt = await prisma.klus.update({
    where: { id: klusId },
    data: { gesloten: nieuweStatus },
    select: { id: true, gesloten: true },
  });

  return Response.json(bijgewerkt);
}
