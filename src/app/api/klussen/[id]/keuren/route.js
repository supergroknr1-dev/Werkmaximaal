import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";

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
    select: { id: true },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }

  const bijgewerkt = await prisma.klus.update({
    where: { id: klusId },
    data: { goedgekeurd },
    select: { id: true, goedgekeurd: true },
  });

  return Response.json(bijgewerkt);
}
