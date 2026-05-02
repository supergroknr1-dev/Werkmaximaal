"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function tijdGeleden(datumString) {
  const verschilSeconden = Math.floor(
    (Date.now() - new Date(datumString).getTime()) / 1000
  );
  if (verschilSeconden < 60) return "zojuist";
  const minuten = Math.floor(verschilSeconden / 60);
  if (minuten < 60)
    return minuten === 1 ? "1 minuut geleden" : `${minuten} minuten geleden`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return uren === 1 ? "1 uur geleden" : `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  if (dagen < 7) return dagen === 1 ? "1 dag geleden" : `${dagen} dagen geleden`;
  return new Date(datumString).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Client-island onder de marketing-secties. Wordt alleen gerenderd
// voor ingelogde gebruikers — anon visitors zien deze component niet,
// dus de fetch naar /api/klussen draait nooit voor hen.
export default function KlussenLijst({ user }) {
  const [klussen, setKlussen] = useState([]);
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [gekozenCategorie, setGekozenCategorie] = useState("");
  const [alleenWerkgebied, setAlleenWerkgebied] = useState(true);

  const isVakman = user?.rol === "vakman";
  const heeftWerkgebied = !!user?.heeftWerkgebied;
  const filterWerkgebiedActief =
    isVakman && heeftWerkgebied && alleenWerkgebied;

  async function haalKlussenOp() {
    const reactie = await fetch("/api/klussen");
    const data = await reactie.json();
    setKlussen(data);
  }

  useEffect(() => {
    haalKlussenOp();
  }, []);

  async function verwijderKlus(id) {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    haalKlussenOp();
  }

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const uniekeCategorieen = [
    ...new Set(klussen.map((k) => k.categorie).filter(Boolean)),
  ].sort();
  const gefilterdeKlussen = klussen.filter((k) => {
    if (filterWerkgebiedActief && !k.inWerkgebied) return false;
    if (gekozenPlaats && k.plaats !== gekozenPlaats) return false;
    if (gekozenCategorie && k.categorie !== gekozenCategorie) return false;
    return true;
  });

  const lijstHeading = isVakman ? "Openstaande opdrachten" : "Mijn klussen";

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        {lijstHeading} ({gefilterdeKlussen.length})
      </h2>

      {isVakman && heeftWerkgebied && (
        <label className="flex items-center gap-2 mb-3 text-sm text-slate-700 select-none">
          <input
            type="checkbox"
            checked={alleenWerkgebied}
            onChange={(e) => setAlleenWerkgebied(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <span>
            Alleen klussen in mijn werkgebied
            {filterWerkgebiedActief && (
              <span className="ml-1 text-xs text-slate-500">
                ({gefilterdeKlussen.length} van {klussen.length})
              </span>
            )}
          </span>
        </label>
      )}

      {klussen.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter op plaats
            </label>
            <select
              value={gekozenPlaats}
              onChange={(e) => setGekozenPlaats(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            >
              <option value="">Alle plaatsen</option>
              {uniekePlaatsen.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter op categorie
            </label>
            <select
              value={gekozenCategorie}
              onChange={(e) => setGekozenCategorie(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            >
              <option value="">Alle categorieën</option>
              {uniekeCategorieen.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {klussen.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
          Nog geen klussen geplaatst.
        </div>
      ) : gefilterdeKlussen.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
          Geen klussen gevonden met dit filter.
        </div>
      ) : (
        <div className="space-y-3">
          {gefilterdeKlussen.map((klus) => (
            <div
              key={klus.id}
              className="bg-white border border-slate-200 rounded-md p-5 hover:border-slate-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2 gap-4">
                <h3 className="text-base font-medium">
                  <Link
                    href={`/klussen/${klus.id}`}
                    className="text-slate-900 hover:underline"
                  >
                    {klus.titel}
                  </Link>
                </h3>
                {user &&
                  (klus.userId === user.id || klus.userId === null) && (
                    <button
                      onClick={() => verwijderKlus(klus.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 hover:underline shrink-0 transition-colors"
                    >
                      Verwijderen
                    </button>
                  )}
              </div>
              <p className="text-xs text-slate-500">
                {klus.straatnaam && (
                  <>
                    {klus.straatnaam} {klus.huisnummer},{" "}
                  </>
                )}
                {!klus.straatnaam && klus.postcode && (
                  <>
                    {klus.postcode}
                    {klus.huisnummer ? ` ${klus.huisnummer}` : ""} ·{" "}
                  </>
                )}
                {klus.plaats}
                <span className="mx-1.5">·</span>
                {tijdGeleden(klus.aangemaakt)}
                {klus.categorie && (
                  <>
                    <span className="mx-1.5">·</span>
                    {klus.categorie}
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {klus.voorkeurVakmanType === "professional" && (
                  <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                    Vakman
                  </span>
                )}
                {klus.voorkeurVakmanType === "hobbyist" && (
                  <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Handige Harrie
                  </span>
                )}
                {!klus.voorkeurVakmanType && (
                  <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                    Vakman of Handige Harrie
                  </span>
                )}
              </div>
              <Link
                href={`/klussen/${klus.id}`}
                className="text-xs text-slate-600 hover:text-slate-900 mt-3 inline-block transition-colors"
              >
                Details bekijken →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
