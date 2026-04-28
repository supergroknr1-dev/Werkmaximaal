import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";
import { bedragVoorVakman } from "../../../../../lib/lead-prijs";
import {
  emitActivity,
  EVENT_TYPES,
  ipFromRequest,
} from "../../../../../lib/events";

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
    select: { id: true, rol: true, vakmanType: true },
  });
  if (!user || user.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakmannen kunnen leads kopen." },
      { status: 403 }
    );
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: {
      id: true,
      userId: true,
      voorkeurVakmanType: true,
      gesloten: true,
      goedgekeurd: true,
    },
  });
  if (!klus || !klus.goedgekeurd) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }
  if (klus.gesloten) {
    return Response.json(
      { error: "Deze klus is gesloten en accepteert geen nieuwe leads meer." },
      { status: 400 }
    );
  }
  if (klus.userId === user.id) {
    return Response.json(
      { error: "U kunt geen lead kopen op uw eigen klus." },
      { status: 400 }
    );
  }
  if (
    klus.voorkeurVakmanType &&
    user.vakmanType &&
    klus.voorkeurVakmanType !== user.vakmanType
  ) {
    return Response.json(
      {
        error:
          "Deze klant heeft een ander type vakman gevraagd voor deze opdracht.",
      },
      { status: 403 }
    );
  }

  const bedrag = await bedragVoorVakman(user.vakmanType);

  // upsert: idempotent — opnieuw kopen geeft de bestaande lead terug
  const bestond = await prisma.lead.findUnique({
    where: { klusId_vakmanId: { klusId, vakmanId: user.id } },
  });
  const lead = await prisma.lead.upsert({
    where: { klusId_vakmanId: { klusId, vakmanId: user.id } },
    create: { klusId, vakmanId: user.id, bedrag },
    update: {},
  });

  // Alleen event emit bij echte nieuwe lead (niet bij idempotente retry)
  if (!bestond) {
    emitActivity({
      type: EVENT_TYPES.LEAD_GEKOCHT,
      actor: { id: user.id, rol: user.rol },
      targetType: "lead",
      targetId: lead.id,
      payload: {
        klusId,
        bedrag,
        vakmanType: user.vakmanType,
      },
      ipAdres: ipFromRequest(request),
    });
  }

  return Response.json(lead);
}
