import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import {
  logIntervention,
  InterventionError,
} from "../../../../../lib/intervention";

export async function POST(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const data = await request.json().catch(() => ({}));
  const goedgekeurd =
    typeof data.goedgekeurd === "boolean" ? data.goedgekeurd : true;

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: {
      id: true,
      titel: true,
      plaats: true,
      categorie: true,
      goedgekeurd: true,
    },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }

  try {
    await logIntervention({
      request,
      admin,
      actie: goedgekeurd ? "klus.goedgekeurd" : "klus.afgekeurd",
      targetType: "klus",
      targetId: klusId,
      payload: {
        titel: klus.titel,
        plaats: klus.plaats,
        categorie: klus.categorie,
        van: klus.goedgekeurd,
        naar: goedgekeurd,
      },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const bijgewerkt = await prisma.klus.update({
    where: { id: klusId },
    data: { goedgekeurd },
    select: { id: true, goedgekeurd: true },
  });

  return Response.json(bijgewerkt);
}
