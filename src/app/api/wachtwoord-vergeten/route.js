import crypto from "crypto";
import { prisma } from "../../../lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const data = await request.json();
  const email = (data.email ?? "").trim().toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Anti-enumeration: dezelfde response of de gebruiker bestaat of niet.
  // Alleen voor bekende gebruikers maken we daadwerkelijk een token aan.
  if (!user) {
    return Response.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const vervaltOp = new Date(Date.now() + 60 * 60 * 1000); // 1 uur

  await prisma.wachtwoordResetToken.create({
    data: { token, userId: user.id, vervaltOp },
  });

  // TIJDELIJK: e-mailservice nog niet ingericht (komt in blok 4 uit
  // de proposal). Daarom geven we de reset-link voorlopig direct terug
  // zodat we de flow kunnen testen. Dit moet weg zodra SMTP er staat.
  const origin = request.nextUrl.origin;
  const demoResetUrl = `${origin}/wachtwoord-resetten?token=${token}`;

  return Response.json({ success: true, demoResetUrl });
}
