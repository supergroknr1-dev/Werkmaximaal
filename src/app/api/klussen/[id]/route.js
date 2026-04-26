import { prisma } from "../../../../lib/prisma";

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.klus.delete({
    where: { id: parseInt(id) },
  });
  return Response.json({ success: true });
}
