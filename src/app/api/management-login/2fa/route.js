import { prisma } from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";
import {
  verifieerCode,
  verifieerRecoveryCode,
} from "../../../../lib/mfa";
import { emitActivity, EVENT_TYPES, ipFromRequest } from "../../../../lib/events";

/**
 * Stap 2 van de admin-login: TOTP-code (of recovery-code) controleren.
 *
 * Vereist een actieve `preMfaUserId` op de sessie (gezet door de
 * eerste login-stap). Bij succes wordt `preMfaUserId` gewist en
 * `userId` gezet — pas dán is de admin echt ingelogd.
 */
export async function POST(request) {
  const session = await getSession();
  const preId = session.preMfaUserId;
  if (!preId) {
    return Response.json(
      { error: "Sessie verlopen. Begin opnieuw bij de admin-login." },
      { status: 401 }
    );
  }

  const data = await request.json();
  const code = (data.code ?? "").toString().trim();
  const recoveryCode = (data.recoveryCode ?? "").toString().trim();

  if (!code && !recoveryCode) {
    return Response.json(
      { error: "Vul een 6-cijferige code of een recovery-code in." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: preId },
    select: {
      id: true,
      email: true,
      naam: true,
      rol: true,
      isAdmin: true,
      totpSecret: true,
      totpEnabled: true,
      recoveryCodesHash: true,
    },
  });
  if (!user || user.rol !== "admin" || !user.totpEnabled || !user.totpSecret) {
    return Response.json(
      { error: "Account niet meer geschikt voor 2FA-login." },
      { status: 403 }
    );
  }

  let methode = null;
  if (recoveryCode) {
    const r = await verifieerRecoveryCode(recoveryCode, user.recoveryCodesHash);
    if (!r.ok) {
      return Response.json(
        { error: "Recovery-code klopt niet of is al gebruikt." },
        { status: 401 }
      );
    }
    // Verbruikte code uit array verwijderen zodat hergebruik niet kan
    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodesHash: r.nieuweHashes },
    });
    methode = "recovery";
  } else {
    if (!verifieerCode(user.totpSecret, code)) {
      return Response.json({ error: "Code klopt niet." }, { status: 401 });
    }
    methode = "totp";
  }

  // Sessie promoten van pre-login naar volledig ingelogd
  delete session.preMfaUserId;
  session.userId = user.id;
  await session.save();

  emitActivity({
    type: EVENT_TYPES.GEBRUIKER_INGELOGD,
    actor: { id: user.id, rol: user.rol },
    targetType: "user",
    targetId: user.id,
    payload: { mfa: methode },
    ipAdres: ipFromRequest(request),
  });

  return Response.json({ ok: true });
}
