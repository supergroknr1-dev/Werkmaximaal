// Bundeled init-endpoint voor de homepage: doet 4 queries parallel
// i.p.v. 4 round-trips. Snijdt 200-400ms van de eerste pageload.
//
// Gebruikt door page.js bij mount — vervangt:
//   /api/me + /api/stats + /api/instellingen + /api/categorieen

import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { getInstellingen } from "../../../lib/instellingen";

export async function GET() {
  const session = await getSession();

  // 4 queries parallel — Prisma deelt connection-pool, dus dit is
  // dramatisch sneller dan sequentiëel of 4 separate API-calls.
  const [user, vakmannen, klussen, categorieen, instellingen] =
    await Promise.all([
      session.userId
        ? prisma.user.findUnique({
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
          })
        : Promise.resolve(null),
      prisma.user.count({ where: { rol: "vakman" } }),
      prisma.klus.count(),
      prisma.categorie.findMany({
        orderBy: [{ volgorde: "asc" }, { naam: "asc" }],
        select: { id: true, naam: true, volgorde: true },
      }),
      getInstellingen(),
    ]);

  let userPayload = null;
  if (user) {
    const heeftWerkgebied =
      user.rol === "vakman" &&
      (!!user.regioPostcode ||
        !!user.regioPlaats ||
        user._count.werkgebiedenExtra > 0);
    userPayload = { ...user, heeftWerkgebied, _count: undefined };
  } else if (session.userId) {
    // Sessie verwijst naar verwijderd account — schoon op.
    session.destroy();
  }

  return Response.json({
    user: userPayload,
    stats: { vakmannen, klussen },
    categorieen,
    instellingen,
  });
}
