import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";

const TOEGESTANE_TYPES = ["professional", "hobbyist"];

function trimOfNull(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function intOfNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function PATCH(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const bestaande = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: { id: true, rol: true, email: true },
  });
  if (!bestaande) {
    return Response.json({ error: "Vakman niet gevonden." }, { status: 404 });
  }
  if (bestaande.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakman-accounts kunnen via deze route worden bewerkt." },
      { status: 400 }
    );
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Email valideren
  const nieuweEmail = trimOfNull(data.email);
  if (!nieuweEmail) {
    return Response.json({ error: "E-mail is verplicht." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nieuweEmail)) {
    return Response.json(
      { error: "E-mail heeft geen geldig formaat." },
      { status: 400 }
    );
  }
  if (nieuweEmail.toLowerCase() !== bestaande.email.toLowerCase()) {
    const conflict = await prisma.user.findUnique({
      where: { email: nieuweEmail },
      select: { id: true },
    });
    if (conflict && conflict.id !== vakmanId) {
      return Response.json(
        { error: "Deze e-mail is al in gebruik door een ander account." },
        { status: 409 }
      );
    }
  }

  // vakmanType valideren
  const type = trimOfNull(data.vakmanType);
  if (type !== null && !TOEGESTANE_TYPES.includes(type)) {
    return Response.json(
      { error: "Type moet 'professional' of 'hobbyist' zijn." },
      { status: 400 }
    );
  }

  // Professional vereist bedrijfsnaam + KvK-nummer
  const bedrijfsnaam = trimOfNull(data.bedrijfsnaam);
  const kvkNummer = trimOfNull(data.kvkNummer);
  if (type === "professional") {
    if (!bedrijfsnaam) {
      return Response.json(
        { error: "Bedrijfsnaam is verplicht voor een Professional-account." },
        { status: 400 }
      );
    }
    if (!kvkNummer) {
      return Response.json(
        { error: "KvK-nummer is verplicht voor een Professional-account." },
        { status: 400 }
      );
    }
  }

  // Naam-fallback: als voornaam/achternaam zijn ingevuld, sync 'naam' ook
  const voornaam = trimOfNull(data.voornaam);
  const achternaam = trimOfNull(data.achternaam);
  let naam = trimOfNull(data.naam);
  if ((voornaam || achternaam) && !naam) {
    naam = [voornaam, achternaam].filter(Boolean).join(" ");
  }
  if (!naam) {
    return Response.json({ error: "Naam is verplicht." }, { status: 400 });
  }

  // Werkgebied: postcode OF plaats — niet beide. UI stuurt "regioType"
  // mee ("postcode" of "plaats") zodat we weten welke variant primair is
  // en de andere leeg kunnen maken.
  const regioType = data.regioType === "plaats" ? "plaats" : "postcode";
  const regioPostcodeRaw = trimOfNull(data.regioPostcode);
  const regioPlaatsRaw = trimOfNull(data.regioPlaats);
  let regioPostcode = null;
  let regioPlaats = null;
  if (regioType === "postcode") {
    if (regioPostcodeRaw && !/^\d{4}$/.test(regioPostcodeRaw)) {
      return Response.json(
        { error: "Regio-postcode moet exact 4 cijfers zijn." },
        { status: 400 }
      );
    }
    regioPostcode = regioPostcodeRaw;
  } else {
    regioPlaats = regioPlaatsRaw;
  }

  const werkafstand = intOfNull(data.werkafstand);

  const updated = await prisma.user.update({
    where: { id: vakmanId },
    data: {
      email: nieuweEmail,
      naam,
      voornaam,
      achternaam,
      bedrijfsnaam,
      kvkNummer,
      kvkUittrekselUrl: trimOfNull(data.kvkUittrekselUrl),
      kvkUittrekselNaam: trimOfNull(data.kvkUittrekselNaam),
      werkTelefoon: trimOfNull(data.werkTelefoon),
      priveTelefoon: trimOfNull(data.priveTelefoon),
      vakmanType: type,
      straatnaam: trimOfNull(data.straatnaam),
      huisnummer: trimOfNull(data.huisnummer),
      huisnummerToevoeging: trimOfNull(data.huisnummerToevoeging),
      postcode: trimOfNull(data.postcode),
      plaats: trimOfNull(data.plaats),
      werkafstand,
      regioPostcode,
      regioPlaats,
    },
    select: { id: true },
  });

  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const vakman = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: { id: true, rol: true },
  });
  if (!vakman) {
    return Response.json({ error: "Vakman niet gevonden." }, { status: 404 });
  }
  if (vakman.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakman-accounts kunnen via deze route worden verwijderd." },
      { status: 400 }
    );
  }
  if (vakman.id === admin.id) {
    return Response.json(
      { error: "Je kunt je eigen account niet verwijderen." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: vakmanId } });
  return Response.json({ success: true });
}
