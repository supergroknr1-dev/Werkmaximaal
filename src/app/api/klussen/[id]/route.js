import { prisma } from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const sessieUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isAdmin: true },
  });
  if (!sessieUser) {
    return Response.json({ error: "Sessie niet meer geldig." }, { status: 401 });
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true, userId: true },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }

  // Admins mogen alles verwijderen. Verder: ouder dan auth (userId === null)
  // mag iedere ingelogde gebruiker verwijderen; nieuwe klussen alleen door
  // de eigenaar.
  const magVerwijderen =
    sessieUser.isAdmin ||
    klus.userId === null ||
    klus.userId === sessieUser.id;
  if (!magVerwijderen) {
    return Response.json({ error: "Geen toestemming." }, { status: 403 });
  }

  await prisma.klus.delete({ where: { id: klusId } });
  return Response.json({ success: true });
}
