"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { detectMetBron, getZoekSuggesties } from "@/lib/categorie-detect";

export default function BeheerPaneel() {
  const [categorieen, setCategorieen] = useState([]);
  const [trefwoorden, setTrefwoorden] = useState([]);

  // Master-selectie: één beroep dat alle onderliggende vakken aansturen.
  // Wijzigt → zoektermen-, merken- en lijst-vak schakelen mee.
  const [gekozenBeroep, setGekozenBeroep] = useState("");

  const [woordenInput, setWoordenInput] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [statusmelding, setStatusmelding] = useState("");

  const [merkenInput, setMerkenInput] = useState("");
  const [merkBezig, setMerkBezig] = useState(false);
  const [merkFout, setMerkFout] = useState("");
  const [merkStatus, setMerkStatus] = useState("");
  const [testTekst, setTestTekst] = useState("");

  // Beroepen-paneel
  const [beroepenInput, setBeroepenInput] = useState("");
  const [beroepBezig, setBeroepBezig] = useState(false);
  const [beroepFout, setBeroepFout] = useState("");
  const [beroepStatus, setBeroepStatus] = useState("");

  // Verwijderen-modal — werkt voor zowel trefwoord als categorie
  const [teVerwijderen, setTeVerwijderen] = useState(null);
  const [wisInput, setWisInput] = useState("");
  const [wisFout, setWisFout] = useState("");

  // Bewerk-modal voor beroep-naam.
  const [teBewerken, setTeBewerken] = useState(null);
  const [bewerkInput, setBewerkInput] = useState("");
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState("");

  useEffect(() => {
    haalAllesOp();
  }, []);

  async function haalCategorieen() {
    const res = await fetch("/api/categorieen");
    const data = await res.json();
    setCategorieen(data);
    // Zorg dat gekozenBeroep altijd geldig is. Eerste keer = eerste beroep.
    // Als de huidige keuze niet meer in de lijst staat (verwijderd) → reset.
    if (data.length === 0) {
      setGekozenBeroep("");
    } else {
      setGekozenBeroep((current) =>
        current && data.some((c) => c.naam === current)
          ? current
          : data[0].naam
      );
    }
    return data;
  }

  async function haalTrefwoorden() {
    const res = await fetch("/api/trefwoorden");
    const data = await res.json();
    setTrefwoorden(data);
  }

  async function haalAllesOp() {
    await Promise.all([haalCategorieen(), haalTrefwoorden()]);
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

  // Merken-input: zelfde split-logica als zoektermen.
  const merkenLijst = useMemo(() => {
    return [
      ...new Set(
        merkenInput
          .split(/[,\n]+/)
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  }, [merkenInput]);

  // Beroepen-input: zelfde split-logica, maar zonder lowercase
  // (beroepen behouden hoofdletter — "Schilder" niet "schilder").
  // Dedupe gebeurt server-side case-insensitive.
  const beroepenLijst = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of beroepenInput.split(/[,\n]+/)) {
      const naam = raw.trim();
      if (!naam) continue;
      const key = naam.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(naam);
    }
    return out;
  }, [beroepenInput]);

  async function voegToe(e) {
    e.preventDefault();
    if (woordenLijst.length === 0) return;
    setBezig(true);
    setFoutmelding("");
    setStatusmelding("");
    const res = await fetch("/api/trefwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie: gekozenBeroep, woorden: woordenLijst }),
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
      haalTrefwoorden();
    }
    setBezig(false);
  }

  async function voegMerkenToe(e) {
    e.preventDefault();
    if (merkenLijst.length === 0) return;
    setMerkBezig(true);
    setMerkFout("");
    setMerkStatus("");
    const res = await fetch("/api/trefwoorden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categorie: gekozenBeroep,
        woorden: merkenLijst,
        type: "merk",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMerkFout(data.error || "Er ging iets mis.");
    } else {
      const { aantalToegevoegd, aantalBestaand } = data;
      const stukken = [];
      if (aantalToegevoegd) stukken.push(`${aantalToegevoegd} toegevoegd`);
      if (aantalBestaand) stukken.push(`${aantalBestaand} bestond al`);
      setMerkStatus(stukken.join(" · ") || "Geen wijzigingen.");
      setMerkenInput("");
      haalTrefwoorden();
    }
    setMerkBezig(false);
  }

  async function voegBeroepToe(e) {
    e.preventDefault();
    if (beroepenLijst.length === 0) return;
    setBeroepBezig(true);
    setBeroepFout("");
    setBeroepStatus("");
    const res = await fetch("/api/categorieen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namen: beroepenLijst }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBeroepFout(data.error || "Er ging iets mis.");
    } else {
      const { aantalToegevoegd, aantalBestaand } = data;
      const stukken = [];
      if (aantalToegevoegd)
        stukken.push(
          `${aantalToegevoegd} beroep${aantalToegevoegd === 1 ? "" : "en"} toegevoegd`
        );
      if (aantalBestaand)
        stukken.push(
          `${aantalBestaand} bestond${aantalBestaand === 1 ? "" : "en"} al`
        );
      setBeroepStatus(stukken.join(" · ") || "Geen wijzigingen.");
      setBeroepenInput("");
      haalCategorieen();
    }
    setBeroepBezig(false);
  }

  function vraagBevestiging(item) {
    setTeVerwijderen(item);
    setWisInput("");
    setWisFout("");
  }

  function startBewerken(c) {
    setTeBewerken(c);
    setBewerkInput(c.naam);
    setBewerkFout("");
  }

  function annuleerBewerken() {
    setTeBewerken(null);
    setBewerkInput("");
    setBewerkFout("");
  }

  async function bevestigBewerken() {
    if (!teBewerken) return;
    const naam = bewerkInput.trim();
    if (!naam || naam === teBewerken.naam) {
      annuleerBewerken();
      return;
    }
    setBewerkBezig(true);
    setBewerkFout("");
    const res = await fetch(`/api/categorieen/${teBewerken.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ naam }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBewerkFout(data.error || "Bewerken mislukt.");
      setBewerkBezig(false);
      return;
    }
    // Master-selector volgt de hernoeming als die op het oude beroep stond.
    if (gekozenBeroep === teBewerken.naam) {
      setGekozenBeroep(naam);
    }
    await haalAllesOp();
    setBewerkBezig(false);
    annuleerBewerken();
  }

  function annuleerBevestiging() {
    setTeVerwijderen(null);
    setWisInput("");
    setWisFout("");
  }

  async function bevestigVerwijderen() {
    if (wisInput.trim().toUpperCase() !== "WISSEN" || !teVerwijderen) return;
    let res;
    if (teVerwijderen.kind === "bulk") {
      res = await fetch("/api/trefwoorden/bulk-wis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorieId: teVerwijderen.categorieId,
          type: teVerwijderen.type,
        }),
      });
    } else {
      const url =
        teVerwijderen.kind === "categorie"
          ? `/api/categorieen/${teVerwijderen.id}`
          : `/api/trefwoorden/${teVerwijderen.id}`;
      res = await fetch(url, { method: "DELETE" });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setWisFout(data.error || "Verwijderen mislukt.");
      return;
    }
    if (teVerwijderen.kind === "categorie") {
      haalCategorieen();
    } else {
      haalTrefwoorden();
    }
    annuleerBevestiging();
  }

  const groepen = trefwoorden.reduce((acc, t) => {
    if (!acc[t.categorie]) acc[t.categorie] = [];
    acc[t.categorie].push(t);
    return acc;
  }, {});

  // Toon alleen de gegroepeerde lijst voor het gekozen beroep — master
  // bestuurt alle vakken hieronder.
  const gesorteerdeCategorieen = gekozenBeroep && groepen[gekozenBeroep]
    ? [gekozenBeroep]
    : [];

  const testMatch = useMemo(() => {
    return detectMetBron(testTekst, trefwoorden, categorieen);
  }, [testTekst, trefwoorden, categorieen]);

  // Autocomplete + ranked-results: top-8 suggesties, drempel 65% similarity.
  const testSuggesties = useMemo(() => {
    return getZoekSuggesties(testTekst, trefwoorden, categorieen, {
      drempel: 65,
      max: 8,
    });
  }, [testTekst, trefwoorden, categorieen]);

  // Telt per categorie hoeveel trefwoorden er zijn (voor info-tekst bij delete)
  const trefwoordenTeller = useMemo(() => {
    const tel = {};
    for (const t of trefwoorden) tel[t.categorie] = (tel[t.categorie] ?? 0) + 1;
    return tel;
  }, [trefwoorden]);

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
          <div className="px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">
                Beheer beroepen &amp; trefwoorden
              </h1>
              <p className="text-sm text-slate-500">
                Beheer welke beroepen klanten kunnen kiezen, en pas de
                matchwoorden aan die de auto-detectie van categorieën aansturen
                op de homepage.
              </p>
            </div>
            <a
              href="/api/categorieen/export"
              download
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors"
              title="Download JSON-backup"
            >
              ↓ Backup
            </a>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Beroepen beheren ({categorieen.length})
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Voeg één of meerdere beroepen tegelijk toe — gescheiden door komma
            of nieuwe regel. Een beroep kan alleen verwijderd worden als er
            geen klussen of trefwoorden meer aan gekoppeld zijn.
          </p>
          <form onSubmit={voegBeroepToe} className="space-y-3 mb-4">
            <textarea
              value={beroepenInput}
              onChange={(e) => setBeroepenInput(e.target.value)}
              rows={2}
              placeholder="Bijv: Dakdekker, Stukadoor, Glaszetter"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm resize-none"
            />
            {beroepenLijst.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {beroepenLijst.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700"
                  >
                    {b}
                  </span>
                ))}
                <span className="text-xs text-slate-400 self-center ml-1">
                  ({beroepenLijst.length} beroep
                  {beroepenLijst.length === 1 ? "" : "en"})
                </span>
              </div>
            )}
            <button
              type="submit"
              disabled={beroepBezig || beroepenLijst.length === 0}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {beroepBezig
                ? "Bezig..."
                : `Toevoegen${
                    beroepenLijst.length > 1 ? ` (${beroepenLijst.length}×)` : ""
                  }`}
            </button>
          </form>
          {beroepFout && (
            <p className="text-sm text-rose-600 mb-3">{beroepFout}</p>
          )}
          {beroepStatus && (
            <p className="text-sm text-emerald-700 mb-3">{beroepStatus}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {categorieen.length === 0 ? (
              <span className="text-sm text-slate-400">
                Nog geen beroepen — voeg er één toe.
              </span>
            ) : (
              categorieen.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800"
                >
                  {c.naam}
                  <button
                    type="button"
                    onClick={() => startBewerken(c)}
                    className="text-orange-400 hover:text-orange-700 transition-colors text-xs leading-none"
                    aria-label={`Bewerk beroep ${c.naam}`}
                    title="Bewerken"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      vraagBevestiging({
                        kind: "categorie",
                        id: c.id,
                        naam: c.naam,
                      })
                    }
                    className="text-orange-400 hover:text-rose-600 transition-colors text-base leading-none"
                    aria-label={`Verwijder beroep ${c.naam}`}
                    title="Verwijderen"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        <section className="bg-orange-50 border-2 border-orange-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-orange-900 uppercase tracking-wide mb-2">
            Werken aan beroep
          </h2>
          <p className="text-xs text-orange-700 mb-3">
            Kies één beroep — alle vakken hieronder werken op dit beroep
            (zoektermen, merken, en de lijst onderaan).
          </p>
          <select
            value={gekozenBeroep}
            onChange={(e) => setGekozenBeroep(e.target.value)}
            disabled={categorieen.length === 0}
            className="w-full px-4 py-3 bg-white border border-orange-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-600 transition-colors text-base font-medium"
          >
            {categorieen.length === 0 ? (
              <option value="">Voeg eerst een beroep toe ↑</option>
            ) : (
              categorieen.map((c) => (
                <option key={c.id} value={c.naam}>
                  {c.naam}
                </option>
              ))
            )}
          </select>
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Test je zoekopdracht
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Typ een klusbeschrijving en zie hoe de zoekmachine reageert —
            inclusief typo-tolerantie, suggesties en match-percentage. Dit is
            exact wat consumenten op de homepage ervaren.
          </p>
          <input
            type="text"
            value={testTekst}
            onChange={(e) => setTestTekst(e.target.value)}
            placeholder="Bijv: ik wil een Haager schakelaar"
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
              Live resultaten
            </p>
            {testTekst.trim() === "" ? (
              <p className="text-sm text-slate-400">
                Begin te typen om de zoekmachine te testen.
              </p>
            ) : testMatch ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-md px-4 py-3 mb-2">
                  <div className="text-xs uppercase tracking-wide text-orange-700 font-semibold">
                    Beste match
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-0.5">
                    {testMatch.categorie}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    via{" "}
                    {testMatch.bron === "beroep"
                      ? "beroepsnaam"
                      : testMatch.bron}
                    : &quot;<strong>{testMatch.treffer}</strong>&quot; ·{" "}
                    {testMatch.exact ? (
                      <span className="text-emerald-700 font-medium">
                        exact 100%
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        fuzzy {testMatch.score}%
                      </span>
                    )}
                  </div>
                </div>
                {testSuggesties.length > 1 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">
                      Andere suggesties ({testSuggesties.length - 1})
                    </p>
                    <div className="space-y-1">
                      {testSuggesties.slice(1).map((s, i) => (
                        <div
                          key={`${s.type}-${s.treffer}-${i}`}
                          className="flex items-center justify-between gap-2 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold ${
                                s.type === "beroep"
                                  ? "bg-purple-100 text-purple-700"
                                  : s.type === "merk"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {s.type}
                            </span>
                            <span className="text-slate-900 font-medium">
                              {s.treffer}
                            </span>
                            <span className="text-slate-400">
                              → {s.categorie}
                            </span>
                          </div>
                          <span
                            className={`font-medium ${
                              s.exact
                                ? "text-emerald-700"
                                : s.score >= 85
                                ? "text-amber-700"
                                : "text-slate-500"
                            }`}
                          >
                            {s.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Geen match — geen trefwoord, beroep of merk dat dichtbij
                genoeg ligt.
              </p>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Zoektermen toevoegen
            {gekozenBeroep && (
              <span className="text-orange-600 font-medium"> · {gekozenBeroep}</span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Plak meerdere zoektermen tegelijk — gescheiden door komma of
            nieuwe regel. Hele zinsdelen werken ook (bv. &quot;aanbouw bij
            hoekwoning&quot;).
          </p>
          <form onSubmit={voegToe} className="space-y-3">
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
              disabled={
                bezig || woordenLijst.length === 0 || !gekozenBeroep
              }
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {bezig
                ? "Bezig..."
                : `Toevoegen aan ${gekozenBeroep || "..."}${
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

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Merken &amp; Materialen toevoegen
            {gekozenBeroep && (
              <span className="text-blue-600 font-medium"> · {gekozenBeroep}</span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Specifieke merknamen of materialen die het beroep mogen aansturen.
            Voorbeeld: &quot;Hager, ABB, Busch-Jaeger&quot; voor Elektricien.
            Komma- of newline-gescheiden.
          </p>
          <form onSubmit={voegMerkenToe} className="space-y-3">
            <textarea
              value={merkenInput}
              onChange={(e) => setMerkenInput(e.target.value)}
              rows={3}
              placeholder="Bijv: Hager, ABB, Busch-Jaeger"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm resize-none"
            />
            {merkenLijst.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {merkenLijst.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700"
                  >
                    {m}
                  </span>
                ))}
                <span className="text-xs text-slate-400 self-center ml-1">
                  ({merkenLijst.length} item
                  {merkenLijst.length === 1 ? "" : "s"})
                </span>
              </div>
            )}
            <button
              type="submit"
              disabled={merkBezig || merkenLijst.length === 0 || !gekozenBeroep}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {merkBezig
                ? "Bezig..."
                : `Toevoegen aan ${gekozenBeroep || "..."}${
                    merkenLijst.length > 1 ? ` (${merkenLijst.length}×)` : ""
                  }`}
            </button>
          </form>
          {merkFout && (
            <p className="text-sm text-rose-600 mt-3">{merkFout}</p>
          )}
          {merkStatus && (
            <p className="text-sm text-emerald-700 mt-3">{merkStatus}</p>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Bestaande trefwoorden
            {gekozenBeroep && (
              <span className="text-orange-600 font-medium"> · {gekozenBeroep}</span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Toont alle zoektermen en merken voor het gekozen beroep — wijzig
            de keuze bovenaan om naar een ander beroep te schakelen.
          </p>
        </section>

        <div className="space-y-4">
          {gesorteerdeCategorieen.length === 0 ? (
            <p className="text-sm text-slate-500 text-center bg-white border border-slate-200 rounded-md p-6">
              {gekozenBeroep
                ? `Nog geen zoektermen of merken voor ${gekozenBeroep}.`
                : "Kies eerst een beroep bovenaan."}
            </p>
          ) : (
            gesorteerdeCategorieen.map((cat) => {
              const zoektermen = groepen[cat].filter((t) => t.type !== "merk");
              const merken = groepen[cat].filter((t) => t.type === "merk");
              return (
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

                  {zoektermen.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                          Zoektermen ({zoektermen.length})
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            vraagBevestiging({
                              kind: "bulk",
                              type: "zoekterm",
                              categorieId: zoektermen[0].categorieId,
                              categorie: cat,
                              aantal: zoektermen.length,
                            })
                          }
                          className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-medium"
                        >
                          Wis alle ({zoektermen.length})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {zoektermen.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700"
                          >
                            {t.woord}
                            <button
                              type="button"
                              onClick={() =>
                                vraagBevestiging({
                                  kind: "trefwoord",
                                  id: t.id,
                                  woord: t.woord,
                                  categorie: t.categorie,
                                })
                              }
                              className="text-slate-400 hover:text-rose-600 transition-colors text-base leading-none"
                              aria-label={`Verwijder ${t.woord}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {merken.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-blue-600 font-semibold">
                          Merken &amp; Materialen ({merken.length})
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            vraagBevestiging({
                              kind: "bulk",
                              type: "merk",
                              categorieId: merken[0].categorieId,
                              categorie: cat,
                              aantal: merken.length,
                            })
                          }
                          className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-medium"
                        >
                          Wis alle ({merken.length})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {merken.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800"
                          >
                            {t.woord}
                            <button
                              type="button"
                              onClick={() =>
                                vraagBevestiging({
                                  kind: "trefwoord",
                                  id: t.id,
                                  woord: t.woord,
                                  categorie: t.categorie,
                                })
                              }
                              className="text-blue-400 hover:text-rose-600 transition-colors text-base leading-none"
                              aria-label={`Verwijder ${t.woord}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {teBewerken && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          onClick={annuleerBewerken}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Beroep bewerken
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Wijzig de naam van{" "}
              <strong className="text-slate-900">{teBewerken.naam}</strong>.
              Bestaande zoektermen, merken en klussen lopen mee — geen verlies
              van data.
            </p>
            <input
              type="text"
              value={bewerkInput}
              onChange={(e) => setBewerkInput(e.target.value)}
              autoFocus
              maxLength={60}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") bevestigBewerken();
                if (e.key === "Escape") annuleerBewerken();
              }}
            />
            {bewerkFout && (
              <p className="text-sm text-rose-600 mb-2">{bewerkFout}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={annuleerBewerken}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={bevestigBewerken}
                disabled={
                  bewerkBezig ||
                  !bewerkInput.trim() ||
                  bewerkInput.trim() === teBewerken.naam
                }
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {bewerkBezig ? "Bezig..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {teVerwijderen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          onClick={annuleerBevestiging}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {teVerwijderen.kind === "categorie"
                ? "Beroep verwijderen?"
                : teVerwijderen.kind === "bulk"
                ? `Alle ${teVerwijderen.type === "merk" ? "merken & materialen" : "zoektermen"} verwijderen?`
                : "Trefwoord verwijderen?"}
            </h3>
            {teVerwijderen.kind === "categorie" ? (
              <p className="text-sm text-slate-600 mb-4">
                Je staat op het punt het beroep{" "}
                <strong className="text-slate-900">
                  {teVerwijderen.naam}
                </strong>{" "}
                te verwijderen
                {trefwoordenTeller[teVerwijderen.naam] ? (
                  <>
                    {" "}— let op: er {trefwoordenTeller[teVerwijderen.naam] === 1 ? "is" : "zijn"} nog{" "}
                    <strong className="text-rose-700">
                      {trefwoordenTeller[teVerwijderen.naam]} trefwoord
                      {trefwoordenTeller[teVerwijderen.naam] === 1 ? "" : "en"}
                    </strong>{" "}
                    aan gekoppeld
                  </>
                ) : null}
                . Typ <strong>WISSEN</strong> om te bevestigen.
              </p>
            ) : teVerwijderen.kind === "bulk" ? (
              <p className="text-sm text-slate-600 mb-4">
                Je staat op het punt{" "}
                <strong className="text-rose-700">
                  alle {teVerwijderen.aantal}{" "}
                  {teVerwijderen.type === "merk"
                    ? "merken & materialen"
                    : "zoektermen"}
                </strong>{" "}
                voor{" "}
                <strong className="text-slate-900">
                  {teVerwijderen.categorie}
                </strong>{" "}
                te verwijderen. Dit is niet ongedaan te maken (behalve via een
                backup). Typ <strong>WISSEN</strong> om te bevestigen.
              </p>
            ) : (
              <p className="text-sm text-slate-600 mb-4">
                Je staat op het punt{" "}
                <strong className="text-slate-900">
                  {teVerwijderen.woord}
                </strong>{" "}
                uit categorie{" "}
                <strong className="text-slate-900">
                  {teVerwijderen.categorie}
                </strong>{" "}
                te verwijderen. Typ <strong>WISSEN</strong> om te bevestigen.
              </p>
            )}
            <input
              type="text"
              value={wisInput}
              onChange={(e) => setWisInput(e.target.value)}
              autoFocus
              placeholder="WISSEN"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") bevestigVerwijderen();
                if (e.key === "Escape") annuleerBevestiging();
              }}
            />
            {wisFout && (
              <p className="text-sm text-rose-600 mb-2">{wisFout}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={annuleerBevestiging}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={bevestigVerwijderen}
                disabled={wisInput.trim().toUpperCase() !== "WISSEN"}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
