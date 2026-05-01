"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReactieForm({ klusId }) {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [bericht, setBericht] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");

  async function plaatsReactie(e) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding("");

    const res = await fetch(`/api/klussen/${klusId}/reacties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ naam: naam.trim(), bericht: bericht.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    setNaam("");
    setBericht("");
    setBezig(false);
    router.refresh();
  }

  return (
    <form onSubmit={plaatsReactie} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Uw naam
        </label>
        <input
          type="text"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          required
          placeholder="Bijvoorbeeld: Jan de Vakman"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bericht
        </label>
        <textarea
          value={bericht}
          onChange={(e) => setBericht(e.target.value)}
          required
          rows={3}
          placeholder="Bijvoorbeeld: Ik kan deze klus deze week oppakken voor €..."
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm resize-none"
        />
      </div>

      {foutmelding && (
        <p className="text-sm text-rose-600">{foutmelding}</p>
      )}

      <button
        type="submit"
        disabled={bezig || !naam.trim() || !bericht.trim()}
        className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
      >
        {bezig ? "Bezig met plaatsen..." : "Reactie plaatsen"}
      </button>
    </form>
  );
}
