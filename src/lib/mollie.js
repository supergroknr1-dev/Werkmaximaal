import createMollieClient from "@mollie/api-client";

/**
 * Mollie-helper voor iDEAL-betalingen op leads.
 *
 * Configuratie:
 *   MOLLIE_API_KEY  - test_... in dev / live_... in prod
 *   APP_URL         - publieke URL voor redirectUrl + webhookUrl
 *                     Verplicht in prod; in dev valt 'ie terug op
 *                     de request-host zodat de redirect-flow lokaal werkt.
 *                     Webhooks werken NIET op localhost — die alleen op
 *                     Vercel; lokaal valideren we via de redirect-stap.
 *
 * Fail-soft: zonder API-key gooit checkout een herkenbare error die de
 * UI als foutmelding kan tonen.
 */

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return null;
  client = createMollieClient({ apiKey });
  return client;
}

export class MollieNietGeconfigureerdError extends Error {
  constructor() {
    super(
      "Online betaling is nog niet geactiveerd. Vraag de beheerder om de Mollie-koppeling te configureren."
    );
    this.name = "MollieNietGeconfigureerdError";
  }
}

function centenNaarEuro(centen) {
  return (centen / 100).toFixed(2);
}

/**
 * Bouw de absolute URL voor redirect/webhook. In productie altijd
 * APP_URL gebruiken; in dev mag de request-host als fallback.
 */
function bouwAbsoluteUrl(request, pad) {
  const expliciet = process.env.APP_URL;
  if (expliciet) {
    return new URL(pad, expliciet).toString();
  }
  // Fallback: request-host (voor dev)
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}${pad}`;
}

/**
 * Maak een Mollie iDEAL-payment voor een lead-aankoop.
 *
 * @param {object} args
 * @param {Request} args.request - voor URL-bouw
 * @param {object} args.klus     - { id, titel }
 * @param {object} args.vakman   - { id, email, naam, bedrijfsnaam }
 * @param {number} args.bedragInCenten - 1000 = 10 euro
 * @returns {Promise<{ paymentId: string, checkoutUrl: string }>}
 */
export async function maakLeadPayment({ request, klus, vakman, bedragInCenten }) {
  const c = getClient();
  if (!c) throw new MollieNietGeconfigureerdError();

  const redirectUrl = bouwAbsoluteUrl(
    request,
    `/leads/retour?klusId=${klus.id}`
  );
  const webhookUrl = bouwAbsoluteUrl(request, `/api/leads/mollie-webhook`);

  const beschrijving = `Lead voor klus #${klus.id}: ${klus.titel.slice(0, 50)}`;

  const payment = await c.payments.create({
    amount: {
      value: centenNaarEuro(bedragInCenten),
      currency: "EUR",
    },
    description: beschrijving,
    method: "ideal",
    redirectUrl,
    // Webhook werkt alleen op een publiek bereikbare URL (Vercel ja,
    // localhost nee). Bij dev faalt Mollie de webhook-call stilletjes,
    // maar de redirect-flow handelt de lead-creatie alsnog af.
    webhookUrl,
    metadata: {
      klusId: String(klus.id),
      vakmanId: String(vakman.id),
      bedragCenten: bedragInCenten,
    },
  });

  const checkoutUrl = payment.getCheckoutUrl?.() || payment._links?.checkout?.href;
  if (!checkoutUrl) {
    throw new Error("Mollie gaf geen checkout-URL terug.");
  }
  return { paymentId: payment.id, checkoutUrl };
}

/**
 * Haal de huidige status van een Mollie-payment op. Wordt gebruikt door
 * zowel de redirect-handler (synchronously) als de webhook (async backup).
 */
export async function leesPayment(paymentId) {
  const c = getClient();
  if (!c) throw new MollieNietGeconfigureerdError();
  return c.payments.get(paymentId);
}

/**
 * Is de payment definitief betaald? Mollie gebruikt 'paid' voor succes;
 * 'open' / 'pending' / 'authorized' zijn nog onderweg; 'failed' /
 * 'canceled' / 'expired' zijn definitief mislukt.
 */
export function isBetaald(payment) {
  return payment?.status === "paid";
}
