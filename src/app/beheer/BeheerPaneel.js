"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { detectCategorie } from "@/lib/categorie-detect";

const CATEGORIEEN = [
  "Schilder",
  "Loodgieter",
  "Klusjesman",
  "Tuinman",
  "Elektricien",
  "Timmerman",
  "Stratenmaker",
  "Anders",
];

export default function BeheerPaneel() {
  const [trefwoorden, setTrefwoorden] = useState([]);
  const [categorie, setCategorie] = useState(CATEGORIEEN[0]);
  const [woordenInput, setWoordenInput] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [statusmelding, setStatusmelding] = useState("");
  const [filter, setFilter] = useState("");
  const [testTekst, setTestTekst] = useState("");

  useEffect(() => {
    haalOp();
  }, []);

  async function haalOp() {
    const res = await fetch("/api/trefwoorden");
    const data = await res.json();
    setTrefwoorden(data);
  }

  // Splits op komma's of newlines, trim, dedupe, lowercase.
  const woordenLijst = useMemo(() => {
    return [
      ...new Set(
        woordenInput
          .split(/[,\n]+/)
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  }, [woordenInput]);

  async function voegToe(e) {
    e.preventDefault();
    if (woordenLijst.length === 0) return;
    setBezig(true);
    setFoutmelding("");
    setStatusmelding("");
    const res = await fetch("/api/trefwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, woorden: woordenLijst }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
    } else {
      const { aantalToegevoegd, aantalBestaand } = data;
      const stukken = [];
      if (aantalToegevoegd) stukken.push(`${aantalToegevoegd} toegevoegd`);
      if (aantalBestaand) stukken.push(`${aantalBestaand} bestond al`);
      setStatusmelding(stukken.join(" · ") || "Geen wijzigingen.");
      setWoordenInput("");
      haalOp();
    }
    setBezig(false);
  }

  async function verwijder(id) {
    await fetch(`/api/trefwoorden/${id}`, { method: "DELETE" });
    haalOp();
  }

  const groepen = trefwoorden.reduce((acc, t) => {
    if (!acc[t.categorie]) acc[t.categorie] = [];
    acc[t.categorie].push(t);
    return acc;
  }, {});

  const gesorteerdeCategorieen = Object.keys(groepen)
    .sort()
    .filter((c) => !filter || c === filter);

  const testMatch = useMemo(() => {
    return detectCategorie(testTekst, trefwoorden);
  }, [testTekst, trefwoorden]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/admin/instellingen"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar instellingen
        </Link>

        <header className="mb-8 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-slate-900" />
          <div className="px-6 py-5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">
              Beheer trefwoorden
            </h1>
            <p className="text-sm text-slate-500">
              Pas de matchwoorden aan die de auto-detectie van categorieën
              aansturen op de homepage. Korte woorden (&quot;lekkage&quot;) of
              hele zinsdelen (&quot;laadpaal laten installeren&quot;) zijn
              beide toegestaan.
            </p>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Test-modus
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Typ een klusbeschrijving en zie direct welke categorie het systeem
            koppelt — handig om je trefwoordenlijst te verifiëren.
          </p>
          <textarea
            value={testTekst}
            onChange={(e) => setTestTekst(e.target.value)}
            rows={2}
            placeholder="Bijv: mijn aardlekschakelaar klapt eruit"
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm resize-none"
          />
          <div className="mt-2 text-sm">
            {testTekst.trim() === "" ? (
              <span className="text-slate-400">Geen invoer</span>
            ) : testMatch ? (
              <span className="inline-flex items-center gap-1.5 text-orange-700">
                <span className="w-2 h-2 rounded-full bg-orange-600" />
                Match: <strong>{testMatch}</strong>
              </span>
            ) : (
              <span className="text-slate-500">
                Geen match — geen trefwoord gevonden in deze tekst.
              </span>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Trefwoorden toevoegen
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Plak meerdere trefwoorden tegelijk — gescheiden door komma of
            nieuwe regel.
          </p>
          <form onSubmit={voegToe} className="space-y-3">
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full md:w-60 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            >
              {CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <textarea
              value={woordenInput}
              onChange={(e) => setWoordenInput(e.target.value)}
              rows={3}
              placeholder="bijv: laadpaal, perilex, aardlekschakelaar vervangen"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm resize-none"
            />
            {woordenLijst.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {woordenLijst.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700"
                  >
                    {w}
                  </span>
                ))}
                <span className="text-xs text-slate-400 self-center ml-1">
                  ({woordenLijst.length} woord
                  {woordenLijst.length === 1 ? "" : "en"})
                </span>
              </div>
            )}
            <button
              type="submit"
              disabled={bezig || woordenLijst.length === 0}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {bezig
                ? "Bezig..."
                : `Toevoegen aan ${categorie}${
                    woordenLijst.length > 1 ? ` (${woordenLijst.length}×)` : ""
                  }`}
            </button>
          </form>
          {foutmelding && (
            <p className="text-sm text-rose-600 mt-3">{foutmelding}</p>
          )}
          {statusmelding && (
            <p className="text-sm text-emerald-700 mt-3">{statusmelding}</p>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Bestaande trefwoorden ({trefwoorden.length})
            </h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-xs"
            >
              <option value="">Alle categorieën</option>
              {CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="space-y-4">
          {gesorteerdeCategorieen.length === 0 ? (
            <p className="text-sm text-slate-500 text-center bg-white border border-slate-200 rounded-md p-6">
              Nog geen trefwoorden in deze categorie.
            </p>
          ) : (
            gesorteerdeCategorieen.map((cat) => (
              <div
                key={cat}
                className="bg-white border border-slate-200 rounded-md p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  {cat}{" "}
                  <span className="text-slate-400 font-normal">
                    ({groepen[cat].length})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {groepen[cat].map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700"
                    >
                      {t.woord}
                      <button
                        type="button"
                        onClick={() => verwijder(t.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors text-base leading-none"
                        aria-label={`Verwijder ${t.woord}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
