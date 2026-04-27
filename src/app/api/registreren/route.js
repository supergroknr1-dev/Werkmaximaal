import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFOON_REGEX = /^(\+31|0)[1-9]\d{8}$/;
const KVK_REGEX = /^\d{8}$/;
const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

export async function POST(request) {
  const data = await request.json();

  const email = (data.email ?? "").trim().toLowerCase();
  const wachtwoord = data.wachtwoord ?? "";
  const naam = (data.naam ?? "").trim();
  const rol = data.rol;

  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  if (wachtwoord.length < 8) {
    return Response.json(
      { error: "Wachtwoord moet minstens 8 tekens zijn." },
      { status: 400 }
    );
  }
  if (!naam) {
    return Response.json({ error: "Volledige naam is verplicht." }, { status: 400 });
  }
  if (rol !== "consument" && rol !== "vakman") {
    return Response.json({ error: "Ongeldige rol." }, { status: 400 });
  }

  let extra = {};

  if (rol === "vakman") {
    const vakmanType = data.vakmanType;
    if (vakmanType !== "professional" && vakmanType !== "hobbyist") {
      return Response.json(
        { error: "Kies of u een gecertificeerde professional of een hobbyist bent." },
        { status: 400 }
      );
    }

    const telefoon = (data.telefoon ?? "").replace(/[\s-]/g, "").trim();
    const werkafstand = parseInt(data.werkafstand);
    const regioPostcode = (data.regioPostcode ?? "").trim().toUpperCase();

    if (!TELEFOON_REGEX.test(telefoon)) {
      return Response.json(
        { error: "Vul een geldig Nederlands telefoonnummer in." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(werkafstand) || werkafstand < 1 || werkafstand > 500) {
      return Response.json(
        { error: "Werkafstand moet een getal tussen 1 en 500 km zijn." },
        { status: 400 }
      );
    }
    if (!POSTCODE_REGEX.test(regioPostcode)) {
      return Response.json(
        { error: "Vul een geldige postcode in als regio." },
        { status: 400 }
      );
    }

    extra = { vakmanType, telefoon, werkafstand, regioPostcode };

    if (vakmanType === "professional") {
      const bedrijfsnaam = (data.bedrijfsnaam ?? "").trim();
      const kvkNummer = (data.kvkNummer ?? "").trim();

      if (!bedrijfsnaam) {
        return Response.json(
          { error: "Bedrijfsnaam is verplicht voor professionals." },
          { status: 400 }
        );
      }
      if (!KVK_REGEX.test(kvkNummer)) {
        return Response.json(
          { error: "KvK-nummer moet 8 cijfers zijn." },
          { status: 400 }
        );
      }

      extra.bedrijfsnaam = bedrijfsnaam;
      extra.kvkNummer = kvkNummer;
    } else {
      // hobbyist
      if (!data.disclaimerAkkoord) {
        return Response.json(
          { error: "U dient akkoord te gaan met de hobbyist-voorwaarden." },
          { status: 400 }
        );
      }
    }
  }

  const wachtwoordHash = await bcrypt.hash(wachtwoord, 10);

  try {
    const user = await prisma.user.create({
      data: { email, wachtwoordHash, naam, rol, ...extra },
      select: { id: true, email: true, naam: true, rol: true },
    });
    return Response.json(user);
  } catch (e) {
    if (e.code === "P2002") {
      return Response.json(
        { error: "Dit e-mailadres is al geregistreerd." },
        { status: 409 }
      );
    }
    throw e;
  }
}
