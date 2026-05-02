"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { detectMetBron } from "@/lib/categorie-detect";

export default function BeheerPaneel() {
  const [categorieen, setCategorieen] = useState([]);
  const [trefwoorden, setTrefwoorden] = useState([]);
  const [categorie, setCategorie] = useState("");
  const [woordenInput, setWoordenInput] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [statusmelding, setStatusmelding] = useState("");

  // Merken-paneel — eigen state, eigen submit, zelfde patroon als zoektermen.
  const [merkCategorie, setMerkCategorie] = useState("");
  const [merkenInput, setMerkenInput] = useState("");
  const [merkBezig, setMerkBezig] = useState(false);
  const [merkFout, setMerkFout] = useState("");
  const [merkStatus, setMerkStatus] = useState("");
  const [filter, setFilter] = useState("");
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

  useEffect(() => {
    haalAllesOp();
  }, []);

  async function haalCategorieen() {
    const res = await fetch("/api/categorieen");
    const data = await res.json();
    setCategorieen(data);
    if (!categorie && data.length > 0) setCategorie(data[0].naam);
    if (!merkCategorie && data.length > 0) setMerkCategorie(data[0].naam);
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
        categorie: merkCategorie,
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

  function annuleerBevestiging() {
    setTeVerwijderen(null);
    setWisInput("");
    setWisFout("");
  }

  async function bevestigVerwijderen() {
    if (wisInput.trim().toUpperCase() !== "WISSEN" || !teVerwijderen) return;
    const url =
      teVerwijderen.kind === "categorie"
        ? `/api/categorieen/${teVerwijderen.id}`
        : `/api/trefwoorden/${teVerwijderen.id}`;
    const res = await fetch(url, { method: "DELETE" });
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

  const gesorteerdeCategorieen = Object.keys(groepen)
    .sort()
    .filter((c) => !filter || c === filter);

  const testMatch = useMemo(() => {
    return detectMetBron(testTekst, trefwoorden, categorieen);
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
          <div className="px-6 py-5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">
              Beheer beroepen &amp; trefwoorden
            </h1>
            <p className="text-sm text-slate-500">
              Beheer welke beroepen klanten kunnen kiezen, en pas de
              matchwoorden aan die de auto-detectie van categorieën aansturen op
              de homepage.
            </p>
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
                    onClick={() =>
                      vraagBevestiging({
                        kind: "categorie",
                        id: c.id,
                        naam: c.naam,
                      })
                    }
                    className="text-orange-400 hover:text-rose-600 transition-colors text-base leading-none"
                    aria-label={`Verwijder beroep ${c.naam}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

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
                Match: <strong>{testMatch.categorie}</strong>{" "}
                <span className="text-xs text-slate-500">
                  (via {testMatch.bron === "beroep" ? "beroepsnaam" : testMatch.bron}: &quot;{testMatch.treffer}&quot;)
                </span>
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
            Zoektermen toevoegen
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Plak meerdere zoektermen tegelijk — gescheiden door komma of
            nieuwe regel. Voorbeeld: &quot;lekkage, verstopping, kraan&quot; voor
            Loodgieter.
          </p>
          <form onSubmit={voegToe} className="space-y-3">
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full md:w-60 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
              disabled={categorieen.length === 0}
            >
              {categorieen.map((c) => (
                <option key={c.id} value={c.naam}>
                  {c.naam}
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
              disabled={
                bezig || woordenLijst.length === 0 || !categorie
              }
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

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Merken &amp; Materialen toevoegen
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Specifieke merknamen of materialen die het beroep mogen aansturen.
            Voorbeeld: &quot;Hager, ABB, Busch-Jaeger&quot; voor Elektricien.
            Komma- of newline-gescheiden.
          </p>
          <form onSubmit={voegMerkenToe} className="space-y-3">
            <select
              value={merkCategorie}
              onChange={(e) => setMerkCategorie(e.target.value)}
              className="w-full md:w-60 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
              disabled={categorieen.length === 0}
            >
              {categorieen.map((c) => (
                <option key={c.id} value={c.naam}>
                  {c.naam}
                </option>
              ))}
            </select>
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
              disabled={merkBezig || merkenLijst.length === 0 || !merkCategorie}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {merkBezig
                ? "Bezig..."
                : `Toevoegen aan ${merkCategorie}${
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
              {categorieen.map((c) => (
                <option key={c.id} value={c.naam}>
                  {c.naam}
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
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
                        Zoektermen ({zoektermen.length})
                      </p>
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
                      <p className="text-[11px] uppercase tracking-wide text-blue-600 font-semibold mb-1.5">
                        Merken &amp; Materialen ({merken.length})
                      </p>
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
