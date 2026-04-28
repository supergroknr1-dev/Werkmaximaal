import { verwerkLeadPayment } from "../../../../lib/lead-creatie";

/**
 * Mollie roept dit endpoint aan zodra een payment-status verandert
 * (paid/failed/expired/canceled/etc.). De body is application/x-www-form-urlencoded
 * met één veld: `id=tr_xxx`.
 *
 * Belangrijk:
 * - Always respond 200 even bij errors. Mollie retried als 'ie geen
 *   2xx krijgt; om infinite loops te voorkomen geven we altijd ok terug.
 * - Idempotent: verwerkLeadPayment dedupt zelf via Lead's unique
 *   constraint op (klusId, vakmanId).
 *
 * In dev werkt deze webhook NIET (Mollie kan localhost niet bereiken).
 * Op Vercel werkt 'ie wel — daar is APP_URL of de auto-detectie publiek
 * bereikbaar. De redirect-flow handelt lokaal de bevestiging af.
 */
export async function POST(request) {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const paymentId = params.get("id");

  if (!paymentId) {
    return new Response("missing id", { status: 200 });
  }

  try {
    const result = await verwerkLeadPayment(paymentId);
    console.log(
      `[mollie-webhook] ${paymentId} → ${result.status}${result.klusId ? ` (klus ${result.klusId})` : ""}`
    );
  } catch (err) {
    console.error(`[mollie-webhook] ${paymentId} verwerk-fout:`, err?.message);
  }

  return new Response("ok", { status: 200 });
}
