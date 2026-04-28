import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import {
  logIntervention,
  InterventionError,
} from "../../../../../lib/intervention";

export async function DELETE(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const consumentId = parseInt(id);
  if (Number.isNaN(consumentId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const consument = await prisma.user.findUnique({
    where: { id: consumentId },
    select: {
      id: true,
      rol: true,
      naam: true,
      email: true,
      voornaam: true,
      achternaam: true,
    },
  });
  if (!consument) {
    return Response.json({ error: "Consument niet gevonden." }, { status: 404 });
  }
  if (consument.rol !== "consument") {
    return Response.json(
      { error: "Alleen consument-accounts kunnen via deze route worden verwijderd." },
      { status: 400 }
    );
  }
  if (consument.id === admin.id) {
    return Response.json(
      { error: "Je kunt je eigen account niet verwijderen." },
      { status: 400 }
    );
  }

  try {
    await logIntervention({
      request,
      admin,
      actie: "consument.verwijderd",
      targetType: "user",
      targetId: consumentId,
      payload: {
        email: consument.email,
        naam: consument.naam,
        voornaam: consument.voornaam,
        achternaam: consument.achternaam,
      },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Klussen + reacties hebben onDelete: Cascade in het schema, dus die
  // gaan automatisch mee.
  await prisma.user.delete({ where: { id: consumentId } });
  return Response.json({ success: true });
}
