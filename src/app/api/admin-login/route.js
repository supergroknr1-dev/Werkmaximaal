import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { emitActivity, EVENT_TYPES, ipFromRequest } from "../../../lib/events";

/**
 * Stap 1 van de admin-login: e-mail + wachtwoord controleren.
 *
 * - Account moet rol="admin" hebben. Andere accounts krijgen 403 met
 *   verwijzing naar /inloggen.
 * - Foute combinatie geeft dezelfde foutmelding als een onbekend
 *   e-mailadres, om enumeration te voorkomen.
 * - Bij succes:
 *   * totpEnabled = false → session.userId direct gezet, frontend
 *     wordt naar /admin/mfa-setup gestuurd zodat de admin de
 *     verplichte MFA inricht voordat hij verder kan.
 *   * totpEnabled = true → session.preMfaUserId gezet, frontend
 *     vraagt vervolgens om een 6-cijferige code via /api/admin-login/2fa.
 */
export async function POST(request) {
  const data = await request.json();
  const email = (data.email ?? "").trim().toLowerCase();
  const wachtwoord = data.wachtwoord ?? "";

  if (!email || !wachtwoord) {
    return Response.json(
      { error: "E-mail en wachtwoord zijn verplicht." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(wachtwoord, user.wachtwoordHash))) {
    return Response.json(
      { error: "E-mail of wachtwoord klopt niet." },
      { status: 401 }
    );
  }

  if (user.rol !== "admin" || !user.isAdmin) {
    return Response.json(
      {
        error:
          "Dit is een gewone gebruiker. Log in via de reguliere login-pagina.",
        redirect: "/inloggen",
      },
      { status: 403 }
    );
  }

  const session = await getSession();
  // Nooit oude state laten staan
  delete session.preMfaUserId;
  delete session.userId;

  if (!user.totpEnabled) {
    // Eerste login of na admin-reset van MFA: log direct in zodat de
    // admin de setup-pagina kan bereiken; admin-layout dwingt MFA-setup
    // af voor élke andere admin-pagina.
    session.userId = user.id;
    await session.save();

    emitActivity({
      type: EVENT_TYPES.GEBRUIKER_INGELOGD,
      actor: { id: user.id, rol: user.rol },
      targetType: "user",
      targetId: user.id,
      payload: { mfa: "setup-pending" },
      ipAdres: ipFromRequest(request),
    });

    return Response.json({ ok: true, mfaSetupNodig: true });
  }

  // MFA staat aan: alleen pre-login zetten, eindcontrole gebeurt na
  // een geldige TOTP-code.
  session.preMfaUserId = user.id;
  await session.save();

  return Response.json({ ok: true, mfaCodeNodig: true });
}
