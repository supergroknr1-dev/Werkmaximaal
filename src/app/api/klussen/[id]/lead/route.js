import { prisma } from "../../../../../lib/prisma";
import { getSession } from "../../../../../lib/session";
import { bedragVoorVakman } from "../../../../../lib/lead-prijs";
import {
  maakLeadPayment,
  MollieNietGeconfigureerdError,
} from "../../../../../lib/mollie";

/**
 * Start de iDEAL-checkout voor een lead-aankoop.
 *
 * Validatie identiek aan de oude mock-flow (klus open + goedgekeurd,
 * vakman-rol, type-match, niet eigenaar). Verschil: in plaats van
 * direct een Lead-rij maken, maken we een Mollie payment aan en geven
 * we de checkout-URL terug. De Lead wordt pas aangemaakt na betaling
 * (via /leads/retour of de webhook — zie lib/lead-creatie.js).
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      rol: true,
      vakmanType: true,
      email: true,
      naam: true,
      bedrijfsnaam: true,
    },
  });
  if (!user || user.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakmannen kunnen leads kopen." },
      { status: 403 }
    );
  }

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: {
      id: true,
      titel: true,
      userId: true,
      voorkeurVakmanType: true,
      gesloten: true,
      goedgekeurd: true,
    },
  });
  if (!klus || !klus.goedgekeurd) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }
  if (klus.gesloten) {
    return Response.json(
      { error: "Deze klus is gesloten en accepteert geen nieuwe leads meer." },
      { status: 400 }
    );
  }
  if (klus.userId === user.id) {
    return Response.json(
      { error: "U kunt geen lead kopen op uw eigen klus." },
      { status: 400 }
    );
  }
  if (
    klus.voorkeurVakmanType &&
    user.vakmanType &&
    klus.voorkeurVakmanType !== user.vakmanType
  ) {
    return Response.json(
      {
        error:
          "Deze klant heeft een ander type vakman gevraagd voor deze opdracht.",
      },
      { status: 403 }
    );
  }

  // Idempotent: al een lead? Geen nieuwe checkout.
  const bestaande = await prisma.lead.findUnique({
    where: { klusId_vakmanId: { klusId, vakmanId: user.id } },
    select: { id: true },
  });
  if (bestaande) {
    return Response.json(
      { error: "U heeft al een lead voor deze klus." },
      { status: 409 }
    );
  }

  const bedrag = await bedragVoorVakman(user.vakmanType);

  try {
    const { paymentId, checkoutUrl } = await maakLeadPayment({
      request,
      klus,
      vakman: user,
      bedragInCenten: bedrag,
    });
    // Bewaar 't paymentId in de sessie zodat /leads/retour 'm kan
    // ophalen — Mollie geeft 'm niet mee in de redirect-URL.
    session.pendingLeadPayment = paymentId;
    await session.save();
    return Response.json({ paymentId, checkoutUrl });
  } catch (err) {
    if (err instanceof MollieNietGeconfigureerdError) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    console.error("[lead-checkout] Mollie-fout:", err);
    return Response.json(
      { error: "Betaling kon niet worden gestart. Probeer later opnieuw." },
      { status: 502 }
    );
  }
}
