import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function POST(request) {
  const data = await request.json();
  const token = (data.token ?? "").trim();
  const wachtwoord = data.wachtwoord ?? "";

  if (!token) {
    return Response.json({ error: "Reset-token is verplicht." }, { status: 400 });
  }
  if (wachtwoord.length < 8) {
    return Response.json(
      { error: "Wachtwoord moet minstens 8 tekens zijn." },
      { status: 400 }
    );
  }

  const reset = await prisma.wachtwoordResetToken.findUnique({
    where: { token },
  });

  if (!reset || reset.gebruikt || reset.vervaltOp < new Date()) {
    return Response.json(
      { error: "Deze reset-link is ongeldig of verlopen." },
      { status: 400 }
    );
  }

  const wachtwoordHash = await bcrypt.hash(wachtwoord, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { wachtwoordHash },
    }),
    prisma.wachtwoordResetToken.update({
      where: { id: reset.id },
      data: { gebruikt: true },
    }),
  ]);

  return Response.json({ success: true });
}
