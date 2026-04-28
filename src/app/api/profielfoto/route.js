import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { emitActivity, EVENT_TYPES, ipFromRequest } from "../../../lib/events";

const VERCEL_BLOB_REGEX =
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

/**
 * Profielfoto-update — werkt voor eigenaar én admin.
 *
 * Body: { url, vakmanId? }
 *  - Zonder vakmanId of vakmanId === eigen ID → werkt alleen als de
 *    huidige user een vakman is.
 *  - Met vakmanId !== eigen ID → werkt alleen als de huidige user
 *    admin is. We loggen een ActivityEvent zodat traceerbaar is dat
 *    een admin de foto van iemand anders heeft aangepast.
 *
 * `url` moet een Vercel Blob URL zijn (eerst geüpload via
 * /api/upload/profielfoto). Lege string of null wist de foto.
 */
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const data = await request.json().catch(() => ({}));
  const url = (data.url ?? "").toString().trim();
  if (url && !VERCEL_BLOB_REGEX.test(url)) {
    return Response.json(
      { error: "Profielfoto-URL is niet geldig. Upload de foto opnieuw." },
      { status: 400 }
    );
  }

  const targetIdRaw = data.vakmanId;
  const targetId = targetIdRaw ? parseInt(targetIdRaw) : user.id;

  // Doelvakman moet bestaan + rol vakman zijn
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, rol: true, naam: true, bedrijfsnaam: true },
  });
  if (!target || target.rol !== "vakman") {
    return Response.json(
      { error: "Vakman niet gevonden." },
      { status: 404 }
    );
  }

  // Toegangsregels:
  // - eigen vakman-account → OK
  // - admin → OK, maar log ActivityEvent
  // - anders → 403
  const eigen = target.id === user.id;
  if (!eigen && !user.isAdmin) {
    return Response.json(
      { error: "Geen toegang tot dit profiel." },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { profielFotoUrl: url || null },
  });

  if (!eigen && user.isAdmin) {
    emitActivity({
      type: EVENT_TYPES.ADMIN_INGREEP,
      actor: { id: user.id, rol: user.rol },
      targetType: "user",
      targetId: target.id,
      payload: {
        actie: "profielfoto.gewijzigd",
        targetNaam: target.bedrijfsnaam || target.naam,
      },
      ipAdres: ipFromRequest(request),
    });
  }

  return Response.json({ ok: true, profielFotoUrl: url || null });
}
