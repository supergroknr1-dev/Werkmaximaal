import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { getInstellingen } from "../../../lib/instellingen";
import { emitActivity, EVENT_TYPES, ipFromRequest } from "../../../lib/events";

export async function GET() {
  const session = await getSession();
  let sessieUser = null;
  if (session.userId) {
    sessieUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, rol: true, isAdmin: true },
    });
  }

  // Consumenten zien op het dashboard alleen hun eigen klussen (alle
  // statussen). Vakmannen en admins zien alle goedgekeurde, openstaande
  // klussen. Anonieme bezoekers krijgen niets — de homepage verbergt de
  // lijst toch al voor hen.
  let where;
  if (!sessieUser) {
    where = { gesloten: false, goedgekeurd: true };
  } else if (sessieUser.rol === "consument") {
    where = { userId: sessieUser.id };
  } else {
    where = { gesloten: false, goedgekeurd: true };
  }

  const klussen = await prisma.klus.findMany({
    where,
    orderBy: { aangemaakt: "desc" },
  });

  // Voor vakmannen: bepaal welke klussen in hun werkgebied vallen.
  // Match-criteria (zelfde als in lib/match.js): primaire regioPostcode
  // (4 cijfers) of regioPlaats (case-insensitief), of een van de
  // werkgebiedExtra-rijen. Postcode-prefix uit de klus zelf gebruiken
  // we niet aan de client (verborgen om privacy-redenen) — alleen
  // server-side flag.
  let inWerkgebied = () => false;
  if (sessieUser?.rol === "vakman") {
    const vakman = await prisma.user.findUnique({
      where: { id: sessieUser.id },
      select: {
        regioPostcode: true,
        regioPlaats: true,
        werkgebiedenExtra: { select: { type: true, waarde: true } },
      },
    });
    if (vakman) {
      const primairPostcode = vakman.regioPostcode?.trim() || null;
      const primairPlaats = vakman.regioPlaats?.trim().toLowerCase() || null;
      const extras = (vakman.werkgebiedenExtra || []).map((w) => ({
        type: w.type,
        waarde: w.waarde?.toLowerCase().trim(),
      }));
      inWerkgebied = (k) => {
        const klusPostcode4 = (k.postcode || "").trim().slice(0, 4);
        const klusPlaats = (k.plaats || "").trim().toLowerCase();
        if (primairPostcode && klusPostcode4 === primairPostcode) return true;
        if (primairPlaats && klusPlaats === primairPlaats) return true;
        for (const w of extras) {
          if (w.type === "postcode" && klusPostcode4 === w.waarde) return true;
          if (w.type === "plaats" && klusPlaats === w.waarde) return true;
        }
        return false;
      };
    }
  }

  // Adressen zijn alleen zichtbaar voor de eigenaar of een admin.
  // Voor iedereen anders (vakman zonder lead, anoniem) strippen we
  // straatnaam, huisnummer én postcode volledig — alleen plaats blijft
  // staan voor de buurtindicator. Postcode blijft wel in de DB en wordt
  // server-side gebruikt voor matching/heatmaps.
  const veilig = klussen.map((k) => {
    const magVolledig =
      sessieUser?.isAdmin || (sessieUser && k.userId === sessieUser.id);
    const flag = inWerkgebied(k);
    if (magVolledig) return { ...k, inWerkgebied: flag };
    return {
      ...k,
      straatnaam: null,
      huisnummer: null,
      postcode: null,
      inWerkgebied: flag,
    };
  });

  return Response.json(veilig);
}

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json(
      { error: "U moet ingelogd zijn om een klus te plaatsen." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user) {
    session.destroy();
    return Response.json(
      { error: "Sessie is niet meer geldig. Log opnieuw in." },
      { status: 401 }
    );
  }
  if (user.rol !== "consument") {
    return Response.json(
      { error: "Alleen consumenten kunnen klussen plaatsen." },
      { status: 403 }
    );
  }

  const data = await request.json();
  let voorkeur = data.voorkeurVakmanType;
  if (voorkeur === "hobbyist") {
    const instellingen = await getInstellingen();
    if (!instellingen.hobbyistInschakeld) {
      return Response.json(
        { error: "Hobbyist-voorkeur is momenteel uitgeschakeld." },
        { status: 400 }
      );
    }
  }
  // Configurator-velden (optioneel; alleen ingevuld bij categorieën die
  // de configurator op stap 2 ondersteunen — pilot: Schilder).
  const oppervlakte = Number.isFinite(Number(data.oppervlakte))
    ? Math.max(0, Math.floor(Number(data.oppervlakte)))
    : null;
  const aantal = Number.isFinite(Number(data.aantal))
    ? Math.max(0, Math.floor(Number(data.aantal)))
    : null;
  const binnenBuiten = ["binnen", "buiten", "beide"].includes(data.binnenBuiten)
    ? data.binnenBuiten
    : null;
  const urgentie = ["spoed", "deze-week", "deze-maand", "geen-haast"].includes(
    data.urgentie
  )
    ? data.urgentie
    : null;

  // Cross-sell: optioneel verwijst de nieuwe klus naar een primaire klus
  // (bv. een Stukadoor-klus die volgt op een Schilder-klus uit dezelfde
  // aanvraag). Server-side check zodat alleen klussen van dezelfde user
  // gelinkt mogen worden.
  let gerelateerdeAanId = null;
  if (data.gerelateerdeAanId) {
    const parent = await prisma.klus.findUnique({
      where: { id: parseInt(data.gerelateerdeAanId) },
    });
    if (parent && parent.userId === user.id) {
      gerelateerdeAanId = parent.id;
    }
  }

  const nieuweKlus = await prisma.klus.create({
    data: {
      titel: data.titel,
      postcode: data.postcode || null,
      huisnummer: data.huisnummer || null,
      straatnaam: data.straatnaam || null,
      plaats: data.plaats,
      categorie: data.categorie || null,
      voorkeurVakmanType:
        voorkeur === "professional" || voorkeur === "hobbyist" ? voorkeur : null,
      oppervlakte,
      binnenBuiten,
      aantal,
      urgentie,
      userId: user.id,
      gerelateerdeAanId,
    },
  });

  emitActivity({
    type: EVENT_TYPES.KLUS_AANGEMAAKT,
    actor: { id: user.id, rol: user.rol },
    targetType: "klus",
    targetId: nieuweKlus.id,
    payload: {
      categorie: nieuweKlus.categorie,
      plaats: nieuweKlus.plaats,
      // Bewust geen straatnaam/huisnummer — privacy-vriendelijk
      voorkeurVakmanType: nieuweKlus.voorkeurVakmanType,
    },
    ipAdres: ipFromRequest(request),
  });

  return Response.json(nieuweKlus);
}