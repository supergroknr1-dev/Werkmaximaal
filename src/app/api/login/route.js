import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { ADMIN_LOGIN_PATH } from "../../../lib/admin-paths";

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
  // Zelfde foutmelding bij onbekend e-mail of fout wachtwoord, zodat
  // aanvallers niet kunnen ontdekken welke e-mails geregistreerd zijn.
  if (!user) {
    return Response.json(
      { error: "E-mail of wachtwoord klopt niet." },
      { status: 401 }
    );
  }

  const klopt = await bcrypt.compare(wachtwoord, user.wachtwoordHash);
  if (!klopt) {
    return Response.json(
      { error: "E-mail of wachtwoord klopt niet." },
      { status: 401 }
    );
  }

  // Admin-accounts horen niet via deze route binnen te komen — die
  // gebruiken een apart, niet-publiek-bekend pad met verplichte 2FA.
  // We geven géén URL terug aan onbekende callers (security by obscurity);
  // de error-tekst is voldoende voor onze eigen UI.
  if (user.rol === "admin" || user.isAdmin) {
    return Response.json(
      {
        error: "Dit account heeft beheerderrechten en kan hier niet inloggen.",
        redirect: ADMIN_LOGIN_PATH,
      },
      { status: 403 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return Response.json({
    id: user.id,
    email: user.email,
    naam: user.naam,
    rol: user.rol,
  });
}
