import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import { verifieerCode, genereerRecoveryCodes } from "../../../../../lib/mfa";

/**
 * POST { code } — bevestigt het tijdelijk opgeslagen TOTP-secret.
 *
 * Bij eerste succesvolle verificatie:
 * - Zet totpEnabled = true
 * - Genereert 8 recovery-codes (plaintext eenmalig terug naar UI,
 *   bcrypt-hashes naar DB)
 *
 * Vanaf nu eist de admin-login een 6-cijferige code uit de
 * authenticator-app (of een recovery-code als fallback).
 */
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "admin") {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { code } = await request.json().catch(() => ({}));
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabled: true },
  });

  if (!dbUser?.totpSecret) {
    return Response.json(
      { error: "Geen setup-secret gevonden. Begin opnieuw via /admin/mfa-setup." },
      { status: 400 }
    );
  }
  if (dbUser.totpEnabled) {
    return Response.json(
      { error: "MFA is al actief voor dit account." },
      { status: 400 }
    );
  }
  if (!verifieerCode(dbUser.totpSecret, code)) {
    return Response.json(
      { error: "Code klopt niet. Probeer de meest recente uit je authenticator." },
      { status: 401 }
    );
  }

  const { plaintext, hashes } = await genereerRecoveryCodes();

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, recoveryCodesHash: hashes },
  });

  return Response.json({ ok: true, recoveryCodes: plaintext });
}
