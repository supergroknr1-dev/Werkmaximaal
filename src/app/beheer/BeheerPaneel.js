"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [woord, setWoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");

  useEffect(() => {
    haalOp();
  }, []);

  async function haalOp() {
    const res = await fetch("/api/trefwoorden");
    const data = await res.json();
    setTrefwoorden(data);
  }

  async function voegToe(e) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding("");
    const res = await fetch("/api/trefwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, woord: woord.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
    } else {
      setWoord("");
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

  const gesorteerdeCategorieen = Object.keys(groepen).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Beheer trefwoorden
          </h1>
          <p className="text-sm text-slate-500">
            Pas de woordenlijst aan die de auto-detectie van categorieën aanstuurt op de homepage.
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Trefwoord toevoegen</h2>
          <form onSubmit={voegToe} className="flex flex-col md:flex-row gap-3">
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm md:w-44"
            >
              {CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={woord}
              onChange={(e) => setWoord(e.target.value)}
              placeholder="Bijvoorbeeld: heg"
              required
              className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={bezig || !woord.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {bezig ? "Bezig..." : "Toevoegen"}
            </button>
          </form>
          {foutmelding && (
            <p className="text-sm text-rose-600 mt-3">{foutmelding}</p>
          )}
        </div>

        <div className="space-y-4">
          {gesorteerdeCategorieen.length === 0 ? (
            <p className="text-sm text-slate-500 text-center bg-white border border-slate-200 rounded-md p-6">
              Nog geen trefwoorden.
            </p>
          ) : (
            gesorteerdeCategorieen.map((cat) => (
              <div key={cat} className="bg-white border border-slate-200 rounded-md p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  {cat}{" "}
                  <span className="text-slate-400 font-normal">({groepen[cat].length})</span>
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
