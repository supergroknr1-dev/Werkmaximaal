"use client";

import { useState } from "react";

export default function VerifyChainKnop() {
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState(null);

  async function verifieer() {
    setBezig(true);
    setResultaat(null);
    try {
      const res = await fetch("/api/admin/audit-log/verify", { method: "POST" });
      const data = await res.json();
      setResultaat(data);
    } catch (err) {
      setResultaat({ ok: false, reden: err.message });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={verifieer}
        disabled={bezig}
        className="text-xs px-3 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {bezig ? "Verifiëren…" : "🔒 Verifieer hash-chain"}
      </button>
      {resultaat && (
        <p
          className={`text-[11px] mt-1.5 ${
            resultaat.ok ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {resultaat.ok
            ? `✓ Chain intact (${resultaat.geverifieerd} entries)`
            : `⚠ Breuk bij id ${resultaat.breukBijId}: ${resultaat.reden}`}
        </p>
      )}
    </div>
  );
}
