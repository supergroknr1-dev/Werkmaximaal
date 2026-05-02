"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StatsForm({
  beginHandmatig,
  beginVakmannen,
  beginKlussen,
}) {
  const router = useRouter();
  const [handmatig, setHandmatig] = useState(beginHandmatig);
  const [vakmannen, setVakmannen] = useState(beginVakmannen);
  const [klussen, setKlussen] = useState(beginKlussen);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [status, setStatus] = useState("");

  async function toggleHandmatig() {
    setBezig(true);
    setFout("");
    setStatus("");
    const nieuw = !handmatig;
    const res = await fetch("/api/instellingen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statsHandmatig: nieuw }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFout(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }
    setHandmatig(nieuw);
    setStatus(
      nieuw
        ? "✓ Handmatige modus aan — homepage toont jouw waarden."
        : "✓ Live modus aan — homepage telt nu uit de DB."
    );
    setBezig(false);
    router.refresh();
  }

  async function opslaan() {
    setBezig(true);
    setFout("");
    setStatus("");
    const res = await fetch("/api/instellingen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statsVakmannenWaarde: parseInt(vakmannen, 10) || 0,
        statsKlussenWaarde: parseInt(klussen, 10) || 0,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFout(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }
    setStatus("✓ Waarden opgeslagen.");
    setBezig(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toggle: live vs handmatig */}
      <div className="flex items-start justify-between gap-4 py-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            Handmatige waarden gebruiken
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Aan: homepage toont de waarden hieronder. Uit: live tellen uit
            de database (echte vakmannen + klussen).
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={handmatig}
          onClick={toggleHandmatig}
          disabled={bezig}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
            handmatig ? "bg-slate-900" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              handmatig ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Inputs alleen actief als handmatig aan staat */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${
          handmatig ? "opacity-100" : "opacity-50 pointer-events-none"
        }`}
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Vakmannen-waarde
          </label>
          <input
            type="number"
            min="0"
            max="1000000"
            value={vakmannen}
            onChange={(e) => setVakmannen(e.target.value)}
            disabled={!handmatig || bezig}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Klussen-waarde
          </label>
          <input
            type="number"
            min="0"
            max="1000000"
            value={klussen}
            onChange={(e) => setKlussen(e.target.value)}
            disabled={!handmatig || bezig}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={opslaan}
        disabled={!handmatig || bezig}
        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
      >
        {bezig ? "Bezig..." : "Waarden opslaan"}
      </button>

      {fout && <p className="text-sm text-rose-600">{fout}</p>}
      {status && <p className="text-sm text-emerald-700">{status}</p>}
    </div>
  );
}
