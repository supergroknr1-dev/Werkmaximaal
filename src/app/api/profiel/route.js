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
    select: {
      id: true,
      rol: true,
      vakmanType: true,
      naam: true,
      naamLaatstGewijzigd: true,
    },
  });
  if (!huidig) {
    session.destroy();
    return Response.json({ error: "Sessie niet meer geldig." }, { status: 401 });
  }

  const data = await request.json();

  const email = (data.email ?? "").trim().toLowerCase();
  const voornaam = (data.voornaam ?? "").trim();
  const achternaam = (data.achternaam ?? "").trim();
  const naamFallback = (data.naam ?? "").trim();
  const naam =
    voornaam || achternaam ? `${voornaam} ${achternaam}`.trim() : naamFallback;
  const telefoonRuw = (data.telefoon ?? "").replace(/[\s-]/g, "").trim();
  const persoonsPostcode = (data.persoonsPostcode ?? "").trim().toUpperCase();
  const huisnummer = (data.huisnummer ?? "").toString().trim();
  const huisnummerToevoeging = (data.huisnummerToevoeging ?? "")
    .toString()
    .trim();
  const straatnaam = (data.straatnaam ?? "").trim();
  const persoonsPlaats = (data.persoonsPlaats ?? "").trim();

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
  if (persoonsPostcode && !POSTCODE_REGEX.test(persoonsPostcode)) {
    return Response.json(
      { error: "Vul een geldige postcode in voor uw adres (of laat leeg)." },
      { status: 400 }
    );
  }
  if (huisnummer && !/^\d{1,5}$/.test(huisnummer)) {
    return Response.json(
      { error: "Huisnummer mag alleen cijfers bevatten." },
      { status: 400 }
    );
  }

  // Combineer straatnaam + huisnummer + toevoeging als legacy-weergave
  // in het 'adres'-veld, zodat oude code en exports niet stuk gaan.
  const samengesteld = straatnaam
    ? `${straatnaam}${huisnummer ? ` ${huisnummer}` : ""}${
        huisnummerToevoeging ? ` ${huisnummerToevoeging}` : ""
      }`.trim()
    : "";

  // 30-dagen-regel: schermnaam (= naam) mag maar 1x per 30 dagen door
  // de gebruiker zelf worden gewijzigd. Bij wijziging wordt het tijdstip
  // bijgewerkt; admin omzeilt dit via /api/admin/vakmannen/[id].
  const naamGewijzigd = naam !== huidig.naam;
  let nieuweNaamLaatstGewijzigd;
  if (naamGewijzigd) {
    const wachttijdMs = 30 * 24 * 60 * 60 * 1000;
    if (
      huidig.naamLaatstGewijzigd &&
      Date.now() - huidig.naamLaatstGewijzigd.getTime() < wachttijdMs
    ) {
      const beschikbaarVanaf = new Date(
        huidig.naamLaatstGewijzigd.getTime() + wachttijdMs
      );
      return Response.json(
        {
          error: `U kunt uw schermnaam pas weer wijzigen vanaf ${beschikbaarVanaf.toLocaleDateString(
            "nl-NL"
          )}.`,
        },
        { status: 429 }
      );
    }
    nieuweNaamLaatstGewijzigd = new Date();
  }

  const update = {
    naam,
    voornaam: voornaam || null,
    achternaam: achternaam || null,
    email,
    werkTelefoon: telefoonRuw || null,
    straatnaam: straatnaam || null,
    huisnummer: huisnummer || null,
    huisnummerToevoeging: huisnummerToevoeging || null,
    adres: samengesteld || null,
    postcode: persoonsPostcode || null,
    plaats: persoonsPlaats || null,
  };

  if (nieuweNaamLaatstGewijzigd) {
    update.naamLaatstGewijzigd = nieuweNaamLaatstGewijzigd;
  }

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
    // Vakman-profiel: foto-URL + bio voor de publieke profielpagina.
    if (data.profielFotoUrl !== undefined) {
      const url = (data.profielFotoUrl ?? "").trim();
      // Alleen Vercel-Blob-URLs accepteren — voorkomt dat iemand
      // een willekeurige externe URL zet.
      if (url && !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
        return Response.json(
          { error: "Profielfoto-URL is niet geldig. Upload de foto opnieuw." },
          { status: 400 }
        );
      }
      update.profielFotoUrl = url || null;
    }
    if (data.bio !== undefined) {
      const bio = (data.bio ?? "").toString().trim();
      if (bio.length > 1000) {
        return Response.json(
          { error: "Bio mag maximaal 1000 tekens zijn." },
          { status: 400 }
        );
      }
      update.bio = bio || null;
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
        werkTelefoon: true,
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
