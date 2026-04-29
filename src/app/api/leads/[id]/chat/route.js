import { after } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";
import { stuurChatNotificatie } from "../../../../../lib/email";

const MAX_TEKST = 2000; // ruim, ~half A4
const APP_URL = process.env.APP_URL || "https://werkmaximaal.vercel.app";

/**
 * Chat-API per lead. Eén lead = één gesprek-thread tussen de vakman die
 * de lead heeft gekocht en de consument die de klus heeft geplaatst.
 *
 * Auth-regels:
 *   - alleen lead.vakmanId of klus.userId mag GET/POST
 *   - eerste bericht in een thread MOET van de vakman komen
 *
 * GET markeert tegelijk alle berichten van de wederpartij als gelezen.
 * Email-notificatie bij nieuw bericht volgt in een latere stap.
 */

async function getLeadEnRol(leadId, userId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { klus: { select: { userId: true, titel: true } } },
  });
  if (!lead) return { error: { error: "Lead niet gevonden." }, status: 404 };
  if (lead.vakmanId === userId) {
    return { lead, rol: "vakman", wederpartijId: lead.klus.userId };
  }
  if (lead.klus.userId === userId) {
    return { lead, rol: "consument", wederpartijId: lead.vakmanId };
  }
  return { error: { error: "Geen toegang tot dit gesprek." }, status: 403 };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const leadId = parseInt(id);
  if (Number.isNaN(leadId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const r = await getLeadEnRol(leadId, session.userId);
  if (r.error) return Response.json(r.error, { status: r.status });

  // Markeer berichten van de wederpartij als gelezen
  await prisma.chatBericht.updateMany({
    where: { leadId, vanUserId: r.wederpartijId, gelezen: false },
    data: { gelezen: true },
  });

  const berichten = await prisma.chatBericht.findMany({
    where: { leadId },
    orderBy: { aangemaakt: "asc" },
    select: {
      id: true,
      vanUserId: true,
      tekst: true,
      gelezen: true,
      aangemaakt: true,
    },
  });

  return Response.json(berichten);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const leadId = parseInt(id);
  if (Number.isNaN(leadId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const r = await getLeadEnRol(leadId, session.userId);
  if (r.error) return Response.json(r.error, { status: r.status });

  const data = await request.json().catch(() => ({}));
  const tekst = (data.tekst ?? "").toString().trim();

  if (!tekst) {
    return Response.json({ error: "Bericht mag niet leeg zijn." }, { status: 400 });
  }
  if (tekst.length > MAX_TEKST) {
    return Response.json(
      { error: `Bericht mag maximaal ${MAX_TEKST} tekens zijn.` },
      { status: 400 }
    );
  }

  // Eerste bericht moet van de vakman zijn
  if (r.rol === "consument") {
    const eersteBericht = await prisma.chatBericht.findFirst({
      where: { leadId },
      select: { id: true },
    });
    if (!eersteBericht) {
      return Response.json(
        { error: "Wacht tot de vakman je heeft aangeschreven." },
        { status: 403 }
      );
    }
  }

  const bericht = await prisma.chatBericht.create({
    data: {
      leadId,
      vanUserId: session.userId,
      tekst,
    },
    select: {
      id: true,
      vanUserId: true,
      tekst: true,
      gelezen: true,
      aangemaakt: true,
    },
  });

  // Email-notificatie naar de wederpartij. Fire-and-forget zodat de API
  // direct kan antwoorden — de UI hoeft niet op SMTP te wachten. Falen
  // wordt alleen gelogd in stuurChatNotificatie zelf.
  after(async () => {
    try {
      const [afzender, ontvanger] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.userId },
          select: { naam: true, bedrijfsnaam: true },
        }),
        prisma.user.findUnique({
          where: { id: r.wederpartijId },
          select: { email: true, naam: true, bedrijfsnaam: true },
        }),
      ]);
      if (!ontvanger?.email || !afzender) return;

      // Vakman ↔ consument: link naar de pagina waar ontvanger de chat ziet
      const link = r.rol === "vakman"
        ? `${APP_URL}/mijn-klussen` // sender vakman → ontvanger consument
        : `${APP_URL}/mijn-leads`;  // sender consument → ontvanger vakman

      await stuurChatNotificatie({
        ontvanger,
        afzenderNaam: afzender.bedrijfsnaam || afzender.naam || "Iemand",
        klusTitel: r.lead.klus.titel,
        tekst,
        link,
      });
    } catch (err) {
      console.error("[chat] email-notificatie failed:", err?.message);
    }
  });

  return Response.json(bericht);
}
