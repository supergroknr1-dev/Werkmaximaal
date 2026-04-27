import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";

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
    select: { id: true, rol: true },
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

  // Klussen + reacties hebben onDelete: Cascade in het schema, dus die
  // gaan automatisch mee.
  await prisma.user.delete({ where: { id: consumentId } });
  return Response.json({ success: true });
}
