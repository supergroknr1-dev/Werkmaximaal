import bcrypt from "bcryptjs";
import { prisma } from "../../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../../lib/auth";
import {
  logIntervention,
  InterventionError,
} from "../../../../../../lib/intervention";

const MIN_LENGTE = 8;

export async function POST(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const nieuwWachtwoord =
    typeof data.nieuwWachtwoord === "string" ? data.nieuwWachtwoord : "";
  if (nieuwWachtwoord.length < MIN_LENGTE) {
    return Response.json(
      { error: `Wachtwoord moet minimaal ${MIN_LENGTE} tekens zijn.` },
      { status: 400 }
    );
  }

  const vakman = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: { id: true, rol: true, naam: true, email: true },
  });
  if (!vakman) {
    return Response.json({ error: "Vakman niet gevonden." }, { status: 404 });
  }
  if (vakman.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakman-accounts kunnen via deze route worden gereset." },
      { status: 400 }
    );
  }

  // Audit-log eerst — bij ontbrekende reden krijgt de admin een 400
  // en gebeurt er niets met het wachtwoord.
  try {
    await logIntervention({
      request,
      admin,
      actie: "vakman.wachtwoord.gereset",
      targetType: "user",
      targetId: vakmanId,
      payload: { email: vakman.email, naam: vakman.naam },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const wachtwoordHash = await bcrypt.hash(nieuwWachtwoord, 10);
  await prisma.user.update({
    where: { id: vakmanId },
    data: { wachtwoordHash },
  });

  // Eventuele oude reset-tokens ongeldig maken
  await prisma.wachtwoordResetToken.updateMany({
    where: { userId: vakmanId, gebruikt: false },
    data: { gebruikt: true },
  });

  return Response.json({ success: true });
}
