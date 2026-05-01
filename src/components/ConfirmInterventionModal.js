"use client";

import { useEffect, useRef, useState } from "react";

// Categorieën moeten 1-op-1 matchen met TOEGESTANE_CATEGORIEEN in
// src/lib/audit.js. We dupliceren ze hier omdat audit.js server-only is
// (crypto + prisma) en niet vanuit een client-component geïmporteerd
// kan worden.
const CATEGORIEEN = [
  { waarde: "compliance", label: "Compliance — KYC, moderatie, account-pause" },
  { waarde: "pricing", label: "Prijzen — lead-prijs, surge, boost" },
  { waarde: "ranking", label: "Ranking — match-algoritme, Trusted-Pro" },
  { waarde: "support", label: "Support — wachtwoord, bemiddeling, impersonatie" },
  { waarde: "data", label: "Data — PII-inzage, regulatory export" },
  { waarde: "settings", label: "Instellingen — admin-rollen, alerts, retentie" },
];

const MIN_REDEN = 30;

/**
 * Herbruikbaar bevestigings-dialoog voor admin-mutaties.
 *
 * Gebruik:
 *   <ConfirmInterventionModal
 *     open={open}
 *     titel="Vakman bewerken"
 *     beschrijving="Wijzig gegevens van Bart Vakman (id 42)"
 *     defaultCategorie="support"
 *     onAnnuleer={() => setOpen(false)}
 *     onBevestig={async ({ reden, actieCategorie }) => { ... }}
 *   />
 *
 * onBevestig krijgt { reden, actieCategorie } en mag een Promise
 * teruggeven; de modal toont een laad-state tot 'ie resolved/rejected.
 * Bij succes sluit de modal automatisch; bij een gegooide error blijft
 * 'ie open en toont de foutmelding.
 */
export default function ConfirmInterventionModal({
  open,
  titel,
  beschrijving = null,
  defaultCategorie = "support",
  bevestigLabel = "Bevestigen",
  onAnnuleer,
  onBevestig,
}) {
  const [reden, setReden] = useState("");
  const [categorie, setCategorie] = useState(defaultCategorie);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const textareaRef = useRef(null);

  // Reset bij elke (her)open zodat oude reden/foutmelding niet blijven hangen
  useEffect(() => {
    if (open) {
      setReden("");
      setCategorie(defaultCategorie);
      setBezig(false);
      setFout(null);
      // Focus na een tick zodat de modal eerst in beeld is
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, defaultCategorie]);

  if (!open) return null;

  const redenSchoon = reden.trim();
  const tekensOver = MIN_REDEN - redenSchoon.length;
  const geldig = redenSchoon.length >= MIN_REDEN && Boolean(categorie);

  async function handleBevestig() {
    if (!geldig || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      await onBevestig({ reden: redenSchoon, actieCategorie: categorie });
    } catch (err) {
      setFout(err?.message || "Er ging iets mis bij het opslaan.");
      setBezig(false);
    }
  }

  function handleOverlayClick() {
    if (bezig) return;
    onAnnuleer?.();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-md shadow-lg max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900 mb-1">{titel}</h3>
        {beschrijving && (
          <p className="text-xs text-slate-500 mb-4">{beschrijving}</p>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Categorie
          </label>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            disabled={bezig}
            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          >
            {CATEGORIEEN.map((c) => (
              <option key={c.waarde} value={c.waarde}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Reden <span className="text-slate-400">(verplicht, min. {MIN_REDEN} tekens)</span>
          </label>
          <textarea
            ref={textareaRef}
            value={reden}
            onChange={(e) => setReden(e.target.value)}
            disabled={bezig}
            rows={4}
            placeholder="Beschrijf waarom deze ingreep nodig is — zo kan een collega achteraf nagaan wat er gebeurd is."
            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          />
          <p
            className={`text-[11px] mt-1 ${
              redenSchoon.length >= MIN_REDEN ? "text-orange-600" : "text-slate-400"
            }`}
          >
            {redenSchoon.length}/{MIN_REDEN}
            {tekensOver > 0 && ` — nog ${tekensOver} tekens nodig`}
          </p>
        </div>

        {fout && (
          <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {fout}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onAnnuleer}
            disabled={bezig}
            className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleBevestig}
            disabled={!geldig || bezig}
            className="text-xs px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bezig ? "Bezig..." : bevestigLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
