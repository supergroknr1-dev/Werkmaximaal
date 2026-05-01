"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

function eurosVanCenten(centen) {
  return (centen / 100).toFixed(2);
}

export default function PrijsForm({ basisCenten }) {
  const router = useRouter();
  const [euros, setEuros] = useState(eurosVanCenten(basisCenten));
  const [bezig, setBezig] = useState(false);
  const [boodschap, setBoodschap] = useState(null);

  const ingegevenCenten = Math.round(parseFloat(euros.replace(",", ".")) * 100);
  const isAangepast =
    Number.isFinite(ingegevenCenten) && ingegevenCenten !== basisCenten;
  const hobbyistCenten = Number.isFinite(ingegevenCenten)
    ? ingegevenCenten * 2
    : basisCenten * 2;

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    setBoodschap(null);
    const res = await fetch("/api/instellingen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadPrijsCenten: ingegevenCenten }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBoodschap({ type: "error", tekst: data.error || "Opslaan is mislukt." });
      setBezig(false);
      return;
    }
    setBoodschap({ type: "ok", tekst: "Lead-prijs bijgewerkt." });
    setBezig(false);
    router.refresh();
  }

  return (
    <form onSubmit={opslaan} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Basis lead-prijs (Pro)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">€</span>
          <input
            type="text"
            inputMode="decimal"
            value={euros}
            onChange={(e) => setEuros(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm tabular-nums font-mono"
          />
          <span className="text-xs text-slate-500">per lead</span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
        <p>
          Handige Harries betalen automatisch het dubbele:{" "}
          <span className="font-mono font-semibold text-slate-900">
            € {(hobbyistCenten / 100).toFixed(2).replace(".", ",")}
          </span>{" "}
          per lead.
        </p>
      </div>

      {boodschap && (
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${
            boodschap.type === "ok"
              ? "bg-orange-50 text-orange-700 border border-orange-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {boodschap.type === "ok" ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {boodschap.tekst}
        </div>
      )}

      <button
        type="submit"
        disabled={bezig || !isAangepast}
        className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
      >
        <Save size={14} />
        {bezig ? "Opslaan..." : "Opslaan"}
      </button>
    </form>
  );
}
