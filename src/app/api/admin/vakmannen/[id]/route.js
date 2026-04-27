import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";

export async function DELETE(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const vakman = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: { id: true, rol: true },
  });
  if (!vakman) {
    return Response.json({ error: "Vakman niet gevonden." }, { status: 404 });
  }
  if (vakman.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakman-accounts kunnen via deze route worden verwijderd." },
      { status: 400 }
    );
  }
  if (vakman.id === admin.id) {
    return Response.json(
      { error: "Je kunt je eigen account niet verwijderen." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: vakmanId } });
  return Response.json({ success: true });
}
