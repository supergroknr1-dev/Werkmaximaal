import { prisma } from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";
import {
  logIntervention,
  InterventionError,
} from "../../../../lib/intervention";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const sessieUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, naam: true, isAdmin: true },
  });
  if (!sessieUser) {
    return Response.json({ error: "Sessie niet meer geldig." }, { status: 401 });
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true, titel: true, plaats: true, categorie: true, userId: true },
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

  // Alleen admin-deletes vereisen intervention-context (reden + audit-log).
  // Eigenaar-deletes zijn een normale gebruikersactie en hoeven niet via
  // het audit-pad.
  if (sessieUser.isAdmin && klus.userId !== sessieUser.id) {
    try {
      await logIntervention({
        request,
        admin: sessieUser,
        actie: "klus.verwijderd",
        targetType: "klus",
        targetId: klusId,
        payload: {
          titel: klus.titel,
          plaats: klus.plaats,
          categorie: klus.categorie,
          eigenaarId: klus.userId,
        },
      });
    } catch (err) {
      if (err instanceof InterventionError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  }

  await prisma.klus.delete({ where: { id: klusId } });
  return Response.json({ success: true });
}
