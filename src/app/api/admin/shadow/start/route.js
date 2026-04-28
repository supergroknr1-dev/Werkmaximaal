import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import { getSession } from "../../../../../lib/session";
import {
  logIntervention,
  InterventionError,
} from "../../../../../lib/intervention";

/**
 * Admin "Bekijk als deze gebruiker"-mode (shadow mode).
 *
 * Plaatst een mutatie op de iron-session: `shadowAdminId` bewaart het
 * échte admin-ID, en `userId` wordt overschreven met die van de target.
 * Vanaf nu ziet de admin het platform door de ogen van de andere user.
 *
 * Veiligheid:
 * - Vereist admin-rol + e-mail-allowlist (zoals alle admin-routes).
 * - Vereist X-Intervention-Reden + categorie via logIntervention —
 *   shadowen is een gevoelige privacy-actie en moet in audit-log.
 * - Target moet een vakman of consument zijn; admin-shadow-admin
 *   weren we (zou bizarre loops geven).
 */
export async function POST(request) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin || admin.rol !== "admin") {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json().catch(() => ({}));
  const targetId = parseInt(data.vakmanId ?? data.userId);
  if (Number.isNaN(targetId)) {
    return Response.json({ error: "Ongeldig user-id." }, { status: 400 });
  }
  if (targetId === admin.id) {
    return Response.json(
      { error: "Je kunt jezelf niet shadowen." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, rol: true, naam: true, email: true, bedrijfsnaam: true },
  });
  if (!target) {
    return Response.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
  }
  if (target.rol === "admin") {
    return Response.json(
      { error: "Je kunt geen andere admin shadowen." },
      { status: 403 }
    );
  }

  try {
    await logIntervention({
      request,
      admin,
      actie: "shadow.gestart",
      targetType: "user",
      targetId,
      payload: {
        targetEmail: target.email,
        targetNaam: target.bedrijfsnaam || target.naam,
        targetRol: target.rol,
      },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const session = await getSession();
  // Bewaar de échte admin-id zodat we 'm kunnen herstellen op /stop
  session.shadowAdminId = admin.id;
  session.userId = target.id;
  await session.save();

  return Response.json({ ok: true });
}
