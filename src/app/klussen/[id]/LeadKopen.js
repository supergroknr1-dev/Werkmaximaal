"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBedrag } from "../../../lib/lead-prijs";

export default function LeadKopen({ klusId, bedragInCenten }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const bedragLabel = formatBedrag(bedragInCenten);

  async function koop() {
    const ok = confirm(
      `Bevestig: ${bedragLabel} betaling voor deze lead.\n\n` +
        "Demo-modus — er wordt geen echt geld afgeschreven. " +
        "Bij echte deploy komt hier iDEAL via Mollie of Stripe."
    );
    if (!ok) return;

    setBezig(true);
    setFoutmelding("");

    const res = await fetch(`/api/klussen/${klusId}/lead`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={koop}
        disabled={bezig}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
      >
        {bezig ? "Bezig..." : `Lead kopen voor ${bedragLabel}`}
      </button>
      {foutmelding && (
        <p className="text-sm text-rose-600 mt-2">{foutmelding}</p>
      )}
    </>
  );
}
