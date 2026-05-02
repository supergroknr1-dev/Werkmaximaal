import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { emitActivity } from "../../../../lib/events";

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }
  const { id } = await params;
  const trefwoordId = parseInt(id);

  const trefwoord = await prisma.trefwoord.findUnique({
    where: { id: trefwoordId },
    include: { categorieRef: true },
  });
  if (!trefwoord) {
    return Response.json({ error: "Trefwoord niet gevonden." }, { status: 404 });
  }

  await prisma.trefwoord.delete({ where: { id: trefwoordId } });

  emitActivity({
    type:
      trefwoord.type === "merk"
        ? "trefwoord.merk_verwijderd"
        : "trefwoord.zoekterm_verwijderd",
    actor: { id: user.id, rol: "admin" },
    targetType: "categorie",
    targetId: trefwoord.categorieId,
    payload: {
      categorie: trefwoord.categorieRef.naam,
      woord: trefwoord.woord,
    },
  });

  return Response.json({ success: true });
}
