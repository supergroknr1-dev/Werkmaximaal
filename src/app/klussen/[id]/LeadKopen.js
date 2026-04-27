"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeadKopen({ klusId }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");

  async function koop() {
    const ok = confirm(
      "Bevestig: € 10,00 betaling voor deze lead.\n\n" +
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
        {bezig ? "Bezig..." : "Lead kopen voor € 10,00"}
      </button>
      {foutmelding && (
        <p className="text-sm text-rose-600 mt-2">{foutmelding}</p>
      )}
    </>
  );
}
