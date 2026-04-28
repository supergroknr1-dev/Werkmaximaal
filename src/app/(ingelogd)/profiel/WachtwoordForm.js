"use client";

import { useState } from "react";

export default function WachtwoordForm() {
  const [huidig, setHuidig] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [bezig, setBezig] = useState(false);
  const [boodschap, setBoodschap] = useState(null);

  async function opslaan(e) {
    e.preventDefault();
    setBoodschap(null);

    if (nieuw !== bevestig) {
      setBoodschap({
        type: "error",
        tekst: "De nieuwe wachtwoorden komen niet overeen.",
      });
      return;
    }
    if (nieuw.length < 8) {
      setBoodschap({
        type: "error",
        tekst: "Nieuw wachtwoord moet minstens 8 tekens zijn.",
      });
      return;
    }

    setBezig(true);
    const res = await fetch("/api/profiel/wachtwoord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ huidigWachtwoord: huidig, nieuwWachtwoord: nieuw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBoodschap({ type: "error", tekst: data.error || "Wijzigen is mislukt." });
      setBezig(false);
      return;
    }
    setBoodschap({ type: "ok", tekst: "Wachtwoord gewijzigd." });
    setHuidig("");
    setNieuw("");
    setBevestig("");
    setBezig(false);
  }

  return (
    <form onSubmit={opslaan} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Huidig wachtwoord
        </label>
        <input
          type="password"
          value={huidig}
          onChange={(e) => setHuidig(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nieuw wachtwoord
        </label>
        <input
          type="password"
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">Minimaal 8 tekens.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bevestig nieuw wachtwoord
        </label>
        <input
          type="password"
          value={bevestig}
          onChange={(e) => setBevestig(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
      </div>

      {boodschap && (
        <p
          className={`text-sm ${
            boodschap.type === "ok" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {boodschap.tekst}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
      >
        {bezig ? "Wijzigen..." : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}
