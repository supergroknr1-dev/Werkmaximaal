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
      regioPostcode: true,
      regioPlaats: true,
      _count: { select: { werkgebiedenExtra: true } },
    },
  });
  if (!user) {
    // Account is verwijderd terwijl sessie nog actief was
    session.destroy();
    return Response.json({ user: null });
  }

  // heeftWerkgebied = client-flag voor o.a. de werkradius-filter op
  // de homepage. True als vakman een primair werkgebied of extra-rij
  // heeft ingesteld.
  const heeftWerkgebied =
    user.rol === "vakman" &&
    (!!user.regioPostcode ||
      !!user.regioPlaats ||
      user._count.werkgebiedenExtra > 0);

  return Response.json({
    user: { ...user, heeftWerkgebied, _count: undefined },
  });
}
