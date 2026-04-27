import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }
  const { id } = await params;
  await prisma.trefwoord.delete({
    where: { id: parseInt(id) },
  });
  return Response.json({ success: true });
}
