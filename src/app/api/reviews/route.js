import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";

const WACHTTIJD_DAGEN = 10;
const MAX_FOTOS = 5;
const MAX_TEKST = 2000;

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json(
      { error: "U moet ingelogd zijn om een review te plaatsen." },
      { status: 401 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user || user.rol !== "consument") {
    return Response.json(
      { error: "Alleen consumenten kunnen reviews plaatsen." },
      { status: 403 }
    );
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leadId = Number(data.leadId);
  const score = Number(data.score);
  const tekst = typeof data.tekst === "string" ? data.tekst.trim() : "";
  const fotoUrls = Array.isArray(data.fotoUrls)
    ? data.fotoUrls.filter((u) => typeof u === "string" && u.length > 0)
    : [];

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return Response.json({ error: "Ongeldig lead-ID." }, { status: 400 });
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return Response.json(
      { error: "Score moet tussen 1 en 5 liggen." },
      { status: 400 }
    );
  }
  if (fotoUrls.length > MAX_FOTOS) {
    return Response.json(
      { error: `Maximaal ${MAX_FOTOS} foto's per review.` },
      { status: 400 }
    );
  }
  if (tekst.length > MAX_TEKST) {
    return Response.json(
      { error: `Reviewtekst is te lang (max ${MAX_TEKST} tekens).` },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      klus: { select: { userId: true } },
      review: { select: { id: true } },
    },
  });

  if (!lead) {
    return Response.json({ error: "Lead niet gevonden." }, { status: 404 });
  }
  if (lead.klus.userId !== user.id) {
    return Response.json(
      { error: "U kunt alleen vakmannen beoordelen voor uw eigen klussen." },
      { status: 403 }
    );
  }
  if (lead.review) {
    return Response.json(
      { error: "U heeft deze vakman al beoordeeld." },
      { status: 409 }
    );
  }

  const wachttijdMs = WACHTTIJD_DAGEN * 24 * 60 * 60 * 1000;
  const beschikbaarVanaf = new Date(lead.gekochtOp.getTime() + wachttijdMs);
  if (Date.now() < beschikbaarVanaf.getTime()) {
    return Response.json(
      {
        error: `U kunt deze vakman pas beoordelen vanaf ${beschikbaarVanaf.toLocaleDateString(
          "nl-NL"
        )}.`,
      },
      { status: 400 }
    );
  }

  const review = await prisma.review.create({
    data: {
      leadId: lead.id,
      consumentId: user.id,
      score,
      tekst: tekst || null,
      fotoUrls,
    },
  });

  return Response.json(review);
}
