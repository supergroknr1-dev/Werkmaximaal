import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";
import { emitActivity, EVENT_TYPES, ipFromRequest } from "../../../../../lib/events";

/**
 * Eindigt shadow-mode: zet session.userId terug naar shadowAdminId
 * en wist de shadow-marker. Bewust GEEN logIntervention hier — stop
 * is een terugkeer naar normaal gedrag, geen gevoelige mutatie. Wel
 * een ActivityEvent voor traceability.
 *
 * Shadow-status is geen security-token — als je 'm kwijt bent (cookie
 * weg) val je gewoon terug op niet-ingelogd.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session.shadowAdminId) {
    return Response.json(
      { error: "Niet in shadow-mode." },
      { status: 400 }
    );
  }

  const adminId = session.shadowAdminId;
  const shadowedId = session.userId;

  // Verifieer dat de admin-id nog bestaat als admin
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, rol: true, isAdmin: true },
  });
  if (!admin || admin.rol !== "admin") {
    // Iets is mis — clear de hele sessie en laat opnieuw inloggen
    session.destroy();
    return Response.json(
      { error: "Admin-sessie ongeldig. Log opnieuw in." },
      { status: 401 }
    );
  }

  session.userId = adminId;
  delete session.shadowAdminId;
  await session.save();

  emitActivity({
    type: EVENT_TYPES.ADMIN_INGREEP,
    actor: { id: adminId, rol: "admin" },
    targetType: "user",
    targetId: shadowedId,
    payload: { actie: "shadow.gestopt" },
    ipAdres: ipFromRequest(request),
  });

  return Response.json({ ok: true });
}
