import { prisma } from "./prisma";
import { emitActivity, EVENT_TYPES } from "./events";
import { leesPayment, isBetaald } from "./mollie";

/**
 * Idempotente lead-creatie op basis van een Mollie payment-id.
 *
 * Wordt zowel aangeroepen vanuit de redirect-handler (synchronously
 * wanneer de vakman terugkomt op /leads/retour) als de webhook (async
 * backup van Mollie). Beide paden mogen elkaar overlappen — de
 * uniqueness van Lead op (klusId, vakmanId) zorgt dat er nooit twee
 * rijen ontstaan.
 *
 * @param {string} paymentId
 * @param {string|null} ipAdres
 * @returns {Promise<{ status: 'paid' | 'pending' | 'failed' | 'al-aanwezig',
 *                     lead?: object, payment?: object, klusId?: number }>}
 */
export async function verwerkLeadPayment(paymentId, ipAdres = null) {
  const payment = await leesPayment(paymentId);

  const klusId = parseInt(payment?.metadata?.klusId);
  const vakmanId = parseInt(payment?.metadata?.vakmanId);
  const bedragCenten =
    parseInt(payment?.metadata?.bedragCenten) ||
    Math.round(parseFloat(payment?.amount?.value || "0") * 100);

  if (Number.isNaN(klusId) || Number.isNaN(vakmanId)) {
    return { status: "failed", payment };
  }

  // Bestaande lead? Klaar — niets te doen, idempotent.
  const bestaande = await prisma.lead.findUnique({
    where: { klusId_vakmanId: { klusId, vakmanId } },
  });
  if (bestaande) {
    return { status: "al-aanwezig", lead: bestaande, klusId, payment };
  }

  if (!isBetaald(payment)) {
    return { status: payment?.status === "open" || payment?.status === "pending" ? "pending" : "failed", payment, klusId };
  }

  // Klus moet nog open + goedgekeurd zijn (anders weigeren we ondanks
  // betaling — de admin moet 'm dan zelf afhandelen)
  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: { id: true, gesloten: true, goedgekeurd: true, userId: true },
  });
  if (!klus || !klus.goedgekeurd || klus.gesloten || klus.userId === vakmanId) {
    return { status: "failed", payment, klusId };
  }

  // Aanmaken; bij race-condition met webhook vangt de unique-constraint
  // het op — we doen createMany met skipDuplicates voor zekerheid.
  await prisma.lead.createMany({
    data: { klusId, vakmanId, bedrag: bedragCenten },
    skipDuplicates: true,
  });
  const lead = await prisma.lead.findUnique({
    where: { klusId_vakmanId: { klusId, vakmanId } },
  });

  emitActivity({
    type: EVENT_TYPES.LEAD_GEKOCHT,
    actor: { id: vakmanId, rol: "vakman" },
    targetType: "lead",
    targetId: lead.id,
    payload: {
      klusId,
      bedrag: bedragCenten,
      paymentId,
      method: payment?.method,
    },
    ipAdres,
  });

  return { status: "paid", lead, klusId, payment };
}
