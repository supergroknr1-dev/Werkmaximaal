"use client";

import { useState } from "react";

// Inline ipv import uit lib/lead-prijs — die file sleept indirect prisma
// mee de client-bundle in (instellingen.js → prisma.js).
function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Lead-koop knop. Klik → POST naar /api/klussen/{id}/lead → server maakt
 * een Mollie iDEAL-payment + zet paymentId in de sessie → wij
 * redirecten naar Mollie's checkout-URL. Mollie redirect na betaling
 * terug naar /leads/retour, daar wordt de Lead aangemaakt.
 *
 * Robuustheid: sommige browsers / popup-blockers blokkeren
 * `window.location.href = X` als reactie op een async-fetch. Daarom
 * tonen we óók een directe link zodra de checkoutUrl binnen is — dan
 * kan de gebruiker handmatig klikken als de auto-redirect faalt.
 */
export default function LeadKopen({ klusId, bedragInCenten }) {
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const bedragLabel = formatBedrag(bedragInCenten);

  async function start() {
    setBezig(true);
    setFoutmelding("");
    setCheckoutUrl(null);

    const res = await fetch(`/api/klussen/${klusId}/lead`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis bij het starten van de betaling.");
      setBezig(false);
      return;
    }

    if (!data.checkoutUrl) {
      setFoutmelding("Geen betaal-URL ontvangen. Probeer het later opnieuw.");
      setBezig(false);
      return;
    }

    // Toon de URL als klikbare fallback in case auto-redirect faalt
    setCheckoutUrl(data.checkoutUrl);

    // Probeer auto-redirect
    try {
      window.location.assign(data.checkoutUrl);
    } catch {
      // Browser blokkeerde — link is al zichtbaar, gebruiker kan klikken
    }
  }

  if (checkoutUrl) {
    return (
      <div className="space-y-2">
        <a
          href={checkoutUrl}
          className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-3 rounded-md transition-colors"
        >
          Doorgaan naar iDEAL →
        </a>
        <p className="text-[11px] text-slate-500 text-center">
          Word je niet automatisch doorgestuurd? Klik op de knop hierboven.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={bezig}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
      >
        {bezig
          ? "Doorsturen naar iDEAL..."
          : `Lead kopen voor ${bedragLabel}`}
      </button>
      <p className="text-[11px] text-slate-500 text-center mt-2">
        Veilige betaling via iDEAL
      </p>
      {foutmelding && (
        <p className="text-sm text-rose-600 mt-2">{foutmelding}</p>
      )}
    </>
  );
}
