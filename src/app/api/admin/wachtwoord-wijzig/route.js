import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { isToegestaneAdminEmail } from "../../../../lib/admin-paths";

const MIN_LENGTE = 8;

/**
 * Eigen-wachtwoord-wijzigen voor de admin.
 *
 * - Vereist een actieve admin-sessie (rol=admin + email-allowlist).
 * - De gebruiker moet het huidige wachtwoord meegeven; we verifiëren
 *   dat tegen de bcrypt-hash voordat we updaten. Dat voorkomt dat
 *   iemand met een gekaapte sessie het wachtwoord kan rouleren zonder
 *   het oude te kennen.
 * - Geen reden/audit-log: dit is een self-actie, niet een admin-mutatie
 *   op een ander account.
 */
export async function POST(request) {
  const admin = await getCurrentUser();
  if (
    !admin ||
    !admin.isAdmin ||
    admin.rol !== "admin" ||
    !isToegestaneAdminEmail(admin.email)
  ) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json().catch(() => ({}));
  const huidig = typeof data.huidig === "string" ? data.huidig : "";
  const nieuw = typeof data.nieuw === "string" ? data.nieuw : "";

  if (!huidig || !nieuw) {
    return Response.json(
      { error: "Vul zowel het huidige als het nieuwe wachtwoord in." },
      { status: 400 }
    );
  }
  if (nieuw.length < MIN_LENGTE) {
    return Response.json(
      { error: `Nieuw wachtwoord moet minimaal ${MIN_LENGTE} tekens zijn.` },
      { status: 400 }
    );
  }
  if (huidig === nieuw) {
    return Response.json(
      { error: "Nieuw wachtwoord moet verschillen van het huidige." },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { wachtwoordHash: true },
  });
  if (!dbUser) {
    return Response.json({ error: "Account niet gevonden." }, { status: 404 });
  }

  const klopt = await bcrypt.compare(huidig, dbUser.wachtwoordHash);
  if (!klopt) {
    return Response.json(
      { error: "Het huidige wachtwoord klopt niet." },
      { status: 401 }
    );
  }

  const nieuweHash = await bcrypt.hash(nieuw, 10);
  await prisma.user.update({
    where: { id: admin.id },
    data: { wachtwoordHash: nieuweHash },
  });

  // Eventuele lopende reset-tokens onbruikbaar maken
  await prisma.wachtwoordResetToken.updateMany({
    where: { userId: admin.id, gebruikt: false },
    data: { gebruikt: true },
  });

  return Response.json({ ok: true });
}
