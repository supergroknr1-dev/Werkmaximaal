import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";

/**
 * DELETE: vakman verwijdert een eigen foto. Admin kan via de admin-route
 * elke foto verwijderen (zie /api/admin/showcase/[id]).
 *
 * PATCH: bijschrift of volgorde aanpassen.
 */

async function getEigenaar(request, { params }) {
  const { id } = await params;
  const fotoId = parseInt(id);
  if (Number.isNaN(fotoId)) return { fout: { error: "Ongeldig id." }, status: 400 };

  const session = await getSession();
  if (!session.userId) return { fout: { error: "Inloggen vereist." }, status: 401 };

  const foto = await prisma.showcaseFoto.findUnique({ where: { id: fotoId } });
  if (!foto) return { fout: { error: "Foto niet gevonden." }, status: 404 };
  if (foto.userId !== session.userId) {
    return { fout: { error: "Geen toegang tot deze foto." }, status: 403 };
  }
  return { foto };
}

export async function DELETE(request, ctx) {
  const r = await getEigenaar(request, ctx);
  if (r.fout) return Response.json(r.fout, { status: r.status });
  await prisma.showcaseFoto.delete({ where: { id: r.foto.id } });
  // Vercel Blob blijft technisch staan; opruimen kan later via cron.
  return Response.json({ ok: true });
}

export async function PATCH(request, ctx) {
  const r = await getEigenaar(request, ctx);
  if (r.fout) return Response.json(r.fout, { status: r.status });
  const data = await request.json().catch(() => ({}));
  const update = {};
  if (data.beschrijving !== undefined) {
    const b = (data.beschrijving ?? "").toString().trim().slice(0, 200);
    update.beschrijving = b || null;
  }
  if (data.volgorde !== undefined) {
    const v = parseInt(data.volgorde);
    if (Number.isInteger(v)) update.volgorde = v;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Niets te wijzigen." }, { status: 400 });
  }
  const bijgewerkt = await prisma.showcaseFoto.update({
    where: { id: r.foto.id },
    data: update,
  });
  return Response.json(bijgewerkt);
}
