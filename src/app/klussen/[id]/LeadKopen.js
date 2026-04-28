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
 */
export default function LeadKopen({ klusId, bedragInCenten }) {
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const bedragLabel = formatBedrag(bedragInCenten);

  async function start() {
    setBezig(true);
    setFoutmelding("");

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

    // Hard redirect naar Mollie — daarna handelt /leads/retour de
    // bevestiging af.
    window.location.href = data.checkoutUrl;
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={bezig}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
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
