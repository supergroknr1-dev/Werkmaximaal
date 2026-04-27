import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";

const LEAD_BEDRAG_CENTEN = 1000; // €10

export async function POST(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user || user.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakmannen kunnen leads kopen." },
      { status: 403 }
    );
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true, userId: true },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }
  if (klus.userId === user.id) {
    return Response.json(
      { error: "U kunt geen lead kopen op uw eigen klus." },
      { status: 400 }
    );
  }

  // upsert: idempotent — opnieuw kopen geeft de bestaande lead terug
  const lead = await prisma.lead.upsert({
    where: { klusId_vakmanId: { klusId, vakmanId: user.id } },
    create: { klusId, vakmanId: user.id, bedrag: LEAD_BEDRAG_CENTEN },
    update: {},
  });

  return Response.json(lead);
}
