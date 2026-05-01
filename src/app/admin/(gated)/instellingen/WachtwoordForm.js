"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import WachtwoordVeld from "../../../../components/WachtwoordVeld";

const MIN_LENGTE = 8;
const VELD_KLASSEN =
  "w-full text-sm border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500";

export default function WachtwoordForm() {
  const [huidig, setHuidig] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [succes, setSucces] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setFout(null);
    setSucces(false);

    if (nieuw.length < MIN_LENGTE) {
      setFout(`Nieuw wachtwoord moet minimaal ${MIN_LENGTE} tekens zijn.`);
      return;
    }
    if (nieuw !== bevestig) {
      setFout("De twee nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    if (huidig === nieuw) {
      setFout("Nieuw wachtwoord moet verschillen van het huidige.");
      return;
    }

    setBezig(true);
    try {
      const res = await fetch("/api/admin/wachtwoord-wijzig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huidig, nieuw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(json.error || "Wijzigen mislukt.");
        return;
      }
      setSucces(true);
      setHuidig("");
      setNieuw("");
      setBevestig("");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4"
    >
      <label className="block">
        <span className="block text-xs font-medium text-slate-700 mb-1.5">
          Huidig wachtwoord
        </span>
        <WachtwoordVeld
          value={huidig}
          onChange={(e) => setHuidig(e.target.value)}
          required
          autoComplete="current-password"
          className={VELD_KLASSEN}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-slate-700 mb-1.5">
          Nieuw wachtwoord
          <span className="text-slate-400 font-normal"> (min. {MIN_LENGTE} tekens)</span>
        </span>
        <WachtwoordVeld
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          required
          minLength={MIN_LENGTE}
          autoComplete="new-password"
          className={VELD_KLASSEN}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-slate-700 mb-1.5">
          Bevestig nieuw wachtwoord
        </span>
        <WachtwoordVeld
          value={bevestig}
          onChange={(e) => setBevestig(e.target.value)}
          required
          minLength={MIN_LENGTE}
          autoComplete="new-password"
          className={VELD_KLASSEN}
        />
      </label>

      {fout && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          {fout}
        </p>
      )}
      {succes && (
        <p className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-orange-600" />
          Wachtwoord gewijzigd. Bij je volgende login gebruik je het nieuwe
          wachtwoord.
        </p>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={bezig}
          className="text-xs px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {bezig ? "Bezig..." : "Wachtwoord opslaan"}
        </button>
      </div>
    </form>
  );
}
