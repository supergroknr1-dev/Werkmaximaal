import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFOON_REGEX = /^(\+31|0)[1-9]\d{8}$/;
const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

export async function PUT(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const huidig = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true, vakmanType: true },
  });
  if (!huidig) {
    session.destroy();
    return Response.json({ error: "Sessie niet meer geldig." }, { status: 401 });
  }

  const data = await request.json();

  const email = (data.email ?? "").trim().toLowerCase();
  const naam = (data.naam ?? "").trim();
  const telefoonRuw = (data.telefoon ?? "").replace(/[\s-]/g, "").trim();

  if (!naam) {
    return Response.json({ error: "Naam is verplicht." }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  if (telefoonRuw && !TELEFOON_REGEX.test(telefoonRuw)) {
    return Response.json(
      { error: "Vul een geldig Nederlands telefoonnummer in (of laat leeg)." },
      { status: 400 }
    );
  }

  const update = {
    naam,
    email,
    telefoon: telefoonRuw || null,
  };

  // Vakmannen mogen ook hun werkgebied bijwerken.
  if (huidig.rol === "vakman") {
    if (data.regioPostcode !== undefined) {
      const regio = (data.regioPostcode ?? "").trim().toUpperCase();
      if (regio && !POSTCODE_REGEX.test(regio)) {
        return Response.json(
          { error: "Vul een geldige Nederlandse postcode in voor uw werkgebied." },
          { status: 400 }
        );
      }
      update.regioPostcode = regio || null;
    }
    if (data.werkafstand !== undefined) {
      const km = parseInt(data.werkafstand);
      if (!Number.isInteger(km) || km < 1 || km > 500) {
        return Response.json(
          { error: "Werkafstand moet tussen 1 en 500 km zijn." },
          { status: 400 }
        );
      }
      update.werkafstand = km;
    }
    if (data.bedrijfsnaam !== undefined && huidig.vakmanType === "professional") {
      const bedrijfsnaam = (data.bedrijfsnaam ?? "").trim();
      if (!bedrijfsnaam) {
        return Response.json(
          { error: "Bedrijfsnaam mag niet leeg zijn voor professionals." },
          { status: 400 }
        );
      }
      update.bedrijfsnaam = bedrijfsnaam;
    }
  }

  try {
    const bijgewerkt = await prisma.user.update({
      where: { id: huidig.id },
      data: update,
      select: {
        id: true,
        email: true,
        naam: true,
        telefoon: true,
        rol: true,
        bedrijfsnaam: true,
        regioPostcode: true,
        werkafstand: true,
      },
    });
    return Response.json(bijgewerkt);
  } catch (e) {
    if (e.code === "P2002") {
      return Response.json(
        { error: "Dit e-mailadres is al in gebruik door een ander account." },
        { status: 409 }
      );
    }
    throw e;
  }
}
