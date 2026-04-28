import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import { genereerSecret, genereerSetupData } from "../../../../../lib/mfa";

/**
 * GET = genereer (of regenereer) een TOTP-secret en geef de QR-data terug.
 *
 * Het secret wordt nog NIET in de DB opgeslagen — de gebruiker moet
 * eerst via POST /api/admin/mfa/verify een geldige code bevestigen.
 * Tot die tijd staat het secret in de sessie zodat een refresh van
 * de pagina niet leidt tot een ander secret (= andere QR).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "admin") {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }
  if (user.totpEnabled) {
    return Response.json(
      { error: "MFA is al actief voor dit account." },
      { status: 400 }
    );
  }

  // Hergebruik bestaand pending secret zodat de QR-code stabiel blijft
  // bij elke pagina-refresh. Anders raak je je app + DB uit sync wanneer
  // de admin de pagina herlaadt na het scannen.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true },
  });
  let secret = dbUser?.totpSecret;
  if (!secret) {
    secret = genereerSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: false },
    });
  }

  const { qrDataUrl, otpauthUri } = await genereerSetupData({
    accountLabel: user.email,
    secret,
  });

  return Response.json({ qrDataUrl, otpauthUri, secret });
}
