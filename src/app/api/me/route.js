import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      naam: true,
      rol: true,
      isAdmin: true,
      vakmanType: true,
    },
  });
  if (!user) {
    // Account is verwijderd terwijl sessie nog actief was
    session.destroy();
    return Response.json({ user: null });
  }

  return Response.json({ user });
}
