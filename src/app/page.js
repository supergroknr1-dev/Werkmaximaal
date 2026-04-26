"use client";

import { useState, useEffect } from "react";

function tijdGeleden(datumString) {
  const verschilSeconden = Math.floor((Date.now() - new Date(datumString).getTime()) / 1000);

  if (verschilSeconden < 60) return "zojuist";

  const minuten = Math.floor(verschilSeconden / 60);
  if (minuten < 60) return minuten === 1 ? "1 minuut geleden" : `${minuten} minuten geleden`;

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

const TREFWOORDEN = {
  Tuinman: ["boom", "heg", "tuin", "gras", "snoeien", "plant", "haag"],
  Schilder: ["verf", "muur", "schilderen", "kwast", "behang", "plafond"],
  Loodgieter: ["leiding", "kraan", "lekkage", "wc", "douche", "buis", "verstopping"],
  Elektricien: ["stopcontact", "kabel", "stroom", "lamp", "elektra", "schakelaar"],
  Timmerman: ["hout", "deur", "kast", "vloer", "raam"],
  Stratenmaker: ["tegel", "stoep", "oprit", "bestrating"],
  Klusjesman: ["ophangen", "monteren", "schroef"],
};

function detectCategorie(tekst) {
  if (!tekst) return null;
  const lager = tekst.toLowerCase();
  for (const [categorie, woorden] of Object.entries(TREFWOORDEN)) {
    if (woorden.some((w) => lager.includes(w))) {
      return categorie;
    }
  }
  return null;
}

// Mock postcode-database — een selectie van bekende Nederlandse postcodes (postcode-4 → plaats).
// Voor een complete dataset (~4.000 rijen) kunnen we later seeden; voor de UX is dit voldoende.
const POSTCODES_NL = {
  "1011": "Amsterdam", "1012": "Amsterdam", "1013": "Amsterdam", "1014": "Amsterdam",
  "1015": "Amsterdam", "1016": "Amsterdam", "1017": "Amsterdam", "1018": "Amsterdam",
  "1019": "Amsterdam", "1020": "Amsterdam", "1021": "Amsterdam", "1022": "Amsterdam",
  "1311": "Almere", "1312": "Almere", "1313": "Almere", "1314": "Almere",
  "1501": "Zaandam", "1502": "Zaandam",
  "2011": "Haarlem", "2012": "Haarlem", "2013": "Haarlem",
  "2311": "Leiden", "2312": "Leiden", "2313": "Leiden",
  "2511": "Den Haag", "2512": "Den Haag", "2513": "Den Haag", "2514": "Den Haag",
  "2515": "Den Haag", "2516": "Den Haag", "2517": "Den Haag", "2518": "Den Haag",
  "3011": "Rotterdam", "3012": "Rotterdam", "3013": "Rotterdam", "3014": "Rotterdam",
  "3015": "Rotterdam", "3016": "Rotterdam", "3021": "Rotterdam", "3022": "Rotterdam",
  "3311": "Dordrecht", "3312": "Dordrecht",
  "3511": "Utrecht", "3512": "Utrecht", "3513": "Utrecht", "3514": "Utrecht",
  "3811": "Amersfoort", "3812": "Amersfoort",
  "4811": "Breda", "4812": "Breda",
  "5011": "Tilburg", "5012": "Tilburg",
  "5211": "'s-Hertogenbosch", "5212": "'s-Hertogenbosch",
  "5611": "Eindhoven", "5612": "Eindhoven", "5613": "Eindhoven",
  "6211": "Maastricht", "6212": "Maastricht",
  "6511": "Nijmegen", "6512": "Nijmegen",
  "6811": "Arnhem", "6812": "Arnhem",
  "7311": "Apeldoorn", "7312": "Apeldoorn",
  "7511": "Enschede", "7512": "Enschede",
  "8011": "Zwolle", "8012": "Zwolle",
  "9711": "Groningen", "9712": "Groningen", "9713": "Groningen",
};

const POSTCODE_REGEX = /^(\d{4})([A-Z]{2})$/;

function checkPostcode(input) {
  if (!input) return { state: "leeg" };
  const schoon = input.trim().toUpperCase();
  if (schoon.length < 6) return { state: "typen" };
  const match = schoon.match(POSTCODE_REGEX);
  if (!match) return { state: "fout" };
  const plaats = POSTCODES_NL[match[1]];
  if (!plaats) return { state: "fout" };
  return { state: "ok", plaats };
}

export default function Home() {
  const [klussen, setKlussen] = useState([]);
  const [titel, setTitel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [categorie, setCategorie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [categorieAangeraakt, setCategorieAangeraakt] = useState(false);
  const [stap, setStap] = useState(1);

  useEffect(() => {
    haalKlussenOp();
  }, []);

  useEffect(() => {
    if (categorieAangeraakt) return;
    const gevonden = detectCategorie(titel);
    if (gevonden) setCategorie(gevonden);
  }, [titel, categorieAangeraakt]);

  async function haalKlussenOp() {
    const reactie = await fetch("/api/klussen");
    const data = await reactie.json();
    setKlussen(data);
  }

  async function plaatsKlus(e) {
    e.preventDefault();
    setBezig(true);

    await fetch("/api/klussen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titel,
        postcode,
        plaats: postcodeStatus.plaats,
        categorie,
      }),
    });

    setTitel("");
    setPostcode("");
    setCategorie("");
    setCategorieAangeraakt(false);
    setStap(1);
    setBezig(false);

    haalKlussenOp();
  }

  async function verwijderKlus(id) {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    haalKlussenOp();
  }

  const postcodeStatus = checkPostcode(postcode);
  const huidigeCategorie = detectCategorie(titel);
  const stap1Geldig = postcodeStatus.state === "ok" && titel.trim().length > 0;

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const gefilterdeKlussen = gekozenPlaats
    ? klussen.filter((k) => k.plaats === gekozenPlaats)
    : klussen;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Werkmaximaal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vakmensen voor uw klus
          </p>
        </header>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stap >= 1 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              1
            </span>
            <span className={`text-sm ${stap === 1 ? "font-medium text-slate-900" : "text-slate-500"}`}>
              Uw klus
            </span>
          </div>
          <div className="h-px w-10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stap >= 2 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </span>
            <span className={`text-sm ${stap === 2 ? "font-medium text-slate-900" : "text-slate-500"}`}>
              Bevestigen
            </span>
          </div>
        </div>

        <form onSubmit={plaatsKlus}>
          {stap === 1 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Waar mogen we u mee helpen?
              </h2>
              <p className="text-sm text-slate-500 mb-8">
                Vul uw postcode in en omschrijf de klus. Wij zoeken een geschikte vakman in uw buurt.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postcode
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase().slice(0, 6))}
                    maxLength={6}
                    placeholder="1234AB"
                    className={`w-32 px-3 py-2.5 bg-white border rounded-l-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors uppercase tracking-wider font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                    aria-invalid={postcodeStatus.state === "fout"}
                  />
                  <div
                    className={`flex-1 px-3 py-2.5 bg-slate-50 border border-l-0 rounded-r-md flex items-center gap-2 text-sm ${
                      postcodeStatus.state === "fout" ? "border-rose-300" : "border-slate-300"
                    }`}
                  >
                    {postcodeStatus.state === "ok" && (
                      <>
                        <svg
                          className="w-4 h-4 text-emerald-600 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-500">{postcodeStatus.plaats}</span>
                      </>
                    )}
                    {postcodeStatus.state !== "ok" && (
                      <span className="text-slate-400 text-xs">
                        {postcodeStatus.state === "fout" ? "—" : "Plaatsnaam verschijnt hier"}
                      </span>
                    )}
                  </div>
                </div>
                {postcodeStatus.state === "fout" && (
                  <p className="text-sm text-rose-600 mt-2">Ongeldige postcode</p>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Omschrijving van de klus
                </label>
                <textarea
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  rows={4}
                  placeholder="Bijvoorbeeld: Ik zoek een schilder voor mijn woonkamer en hal."
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors resize-none text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setStap(2)}
                disabled={!stap1Geldig}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
              >
                Volgende
              </button>
            </div>
          )}

          {stap === 2 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-8">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">
                  Uw aanvraag
                </p>
                <p className="text-slate-900 mb-2">{titel}</p>
                <p className="text-sm text-slate-500">
                  {postcode} · {postcodeStatus.plaats}
                </p>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Bevestig en plaats
              </h2>
              <p className="text-sm text-slate-500 mb-8">
                Controleer de categorie en bevestig om uw klus te plaatsen.
              </p>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categorie{" "}
                  <span className="text-slate-400 font-normal text-xs">
                    {huidigeCategorie ? "(automatisch herkend, mag aangepast worden)" : "(optioneel)"}
                  </span>
                </label>
                <input
                  type="text"
                  value={categorie}
                  onChange={(e) => {
                    setCategorie(e.target.value);
                    setCategorieAangeraakt(true);
                  }}
                  list="categorieen-lijst"
                  placeholder="Bijvoorbeeld: Schilder"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
                />
                <datalist id="categorieen-lijst">
                  {CATEGORIEEN.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStap(1)}
                  className="px-5 py-3 text-slate-700 hover:text-slate-900 text-sm font-medium transition-colors"
                >
                  Terug
                </button>
                <button
                  type="submit"
                  disabled={bezig}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium py-3 rounded-md transition-colors"
                >
                  {bezig ? "Bezig..." : "Plaats klus"}
                </button>
              </div>
            </div>
          )}
        </form>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Geplaatste klussen ({gefilterdeKlussen.length})
          </h2>

          {klussen.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter op plaats
              </label>
              <select
                value={gekozenPlaats}
                onChange={(e) => setGekozenPlaats(e.target.value)}
                className="w-full md:w-64 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
              >
                <option value="">Alle plaatsen</option>
                {uniekePlaatsen.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {klussen.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
              Nog geen klussen geplaatst.
            </div>
          ) : gefilterdeKlussen.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
              Geen klussen gevonden in {gekozenPlaats}.
            </div>
          ) : (
            <div className="space-y-3">
              {gefilterdeKlussen.map((klus) => (
                <div
                  key={klus.id}
                  className="bg-white border border-slate-200 rounded-md p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-base font-medium text-slate-900">{klus.titel}</h3>
                    <button
                      onClick={() => verwijderKlus(klus.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 hover:underline shrink-0 transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {klus.postcode && <>{klus.postcode} · </>}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
