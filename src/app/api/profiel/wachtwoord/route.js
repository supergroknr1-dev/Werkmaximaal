import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const data = await request.json();
  const huidig = data.huidigWachtwoord ?? "";
  const nieuw = data.nieuwWachtwoord ?? "";

  if (nieuw.length < 8) {
    return Response.json(
      { error: "Nieuw wachtwoord moet minstens 8 tekens zijn." },
      { status: 400 }
    );
  }
  if (huidig === nieuw) {
    return Response.json(
      { error: "Nieuw wachtwoord moet anders zijn dan het huidige." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, wachtwoordHash: true },
  });
  if (!user) {
    session.destroy();
    return Response.json({ error: "Sessie niet meer geldig." }, { status: 401 });
  }

  const klopt = await bcrypt.compare(huidig, user.wachtwoordHash);
  if (!klopt) {
    return Response.json(
      { error: "Huidig wachtwoord is niet correct." },
      { status: 400 }
    );
  }

  const nieuweHash = await bcrypt.hash(nieuw, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { wachtwoordHash: nieuweHash },
  });

  return Response.json({ success: true });
}
