import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import {
  logIntervention,
  InterventionError,
} from "../../../../../lib/intervention";

/**
 * Admin verwijdert een showcase-foto van een vakman.
 * Gaat via logIntervention (reden + audit-log) zodat verwijderingen
 * herleidbaar zijn — vakman ziet z'n foto's plotseling weg en moet
 * weten waarom.
 */
export async function DELETE(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const fotoId = parseInt(id);
  if (Number.isNaN(fotoId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const foto = await prisma.showcaseFoto.findUnique({
    where: { id: fotoId },
    select: {
      id: true,
      userId: true,
      url: true,
      beschrijving: true,
    },
  });
  if (!foto) {
    return Response.json({ error: "Foto niet gevonden." }, { status: 404 });
  }

  try {
    await logIntervention({
      request,
      admin,
      actie: "showcase.foto.verwijderd",
      targetType: "showcase",
      targetId: fotoId,
      payload: {
        vakmanId: foto.userId,
        url: foto.url,
        beschrijving: foto.beschrijving,
      },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  await prisma.showcaseFoto.delete({ where: { id: fotoId } });
  return Response.json({ ok: true });
}
