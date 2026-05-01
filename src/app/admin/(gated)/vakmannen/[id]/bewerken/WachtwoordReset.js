"use client";

import { useState } from "react";
import {
  useInterventionConfirm,
  interventionHeaders,
} from "../../../../../../lib/intervention-api";
import WachtwoordVeld from "../../../../../../components/WachtwoordVeld";

const MIN_LENGTE = 8;

export default function WachtwoordReset({ vakmanId, vakmanNaam, vakmanEmail }) {
  const [open, setOpen] = useState(false);
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [succes, setSucces] = useState(false);
  const { open: bevestigIngreep, modal: ingreepModal } = useInterventionConfirm();

  function reset() {
    setNieuw("");
    setBevestig("");
    setFout(null);
    setSucces(false);
  }

  async function submit(e) {
    e.preventDefault();
    setFout(null);
    setSucces(false);
    if (nieuw.length < MIN_LENGTE) {
      setFout(`Wachtwoord moet minimaal ${MIN_LENGTE} tekens zijn.`);
      return;
    }
    if (nieuw !== bevestig) {
      setFout("De twee wachtwoorden komen niet overeen.");
      return;
    }
    const beschrijving = vakmanNaam
      ? `${vakmanNaam}${vakmanEmail ? ` (${vakmanEmail})` : ""}`
      : `Vakman id ${vakmanId}`;
    const ok = await bevestigIngreep({
      titel: "Wachtwoord resetten",
      beschrijving,
      defaultCategorie: "support",
      bevestigLabel: "Wachtwoord opslaan",
      onBevestig: async ({ reden, actieCategorie }) => {
        setBezig(true);
        try {
          const res = await fetch(`/api/admin/vakmannen/${vakmanId}/wachtwoord`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...interventionHeaders({ reden, actieCategorie }),
            },
            body: JSON.stringify({ nieuwWachtwoord: nieuw }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || "Resetten mislukt");
        } finally {
          setBezig(false);
        }
      },
    });
    if (ok) {
      setSucces(true);
      setNieuw("");
      setBevestig("");
    }
  }

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Wachtwoord resetten
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Stel direct een nieuw wachtwoord in voor deze vakman. Bestaande
              reset-tokens worden ongeldig.
            </p>
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
            >
              Reset wachtwoord
            </button>
          )}
        </div>

        {open && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Nieuw wachtwoord
              </span>
              <WachtwoordVeld
                value={nieuw}
                onChange={(e) => setNieuw(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                minLength={MIN_LENGTE}
                required
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Bevestig nieuw wachtwoord
              </span>
              <WachtwoordVeld
                value={bevestig}
                onChange={(e) => setBevestig(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                minLength={MIN_LENGTE}
                required
              />
            </label>

            {fout && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                {fout}
              </p>
            )}
            {succes && (
              <p className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                ✓ Wachtwoord is succesvol gewijzigd. Geef het nieuwe wachtwoord
                door aan de vakman.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                disabled={bezig}
                className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={bezig}
                className="text-xs px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {bezig ? "Bezig..." : "Wachtwoord opslaan"}
              </button>
            </div>
          </form>
        )}
      </section>
      {ingreepModal}
    </>
  );
}
