"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

function detectCategorie(tekst, trefwoorden) {
  if (!tekst || !trefwoorden || trefwoorden.length === 0) return null;
  const lager = tekst.toLowerCase();
  for (const t of trefwoorden) {
    if (lager.includes(t.woord)) {
      return t.categorie;
    }
  }
  return null;
}

const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

// Vraagt de officiële PDOK Locatieserver (Nederlandse overheid, gratis)
// om het volledige adres bij een postcode + huisnummer. Filter op
// type:adres zodat we het specifieke adres krijgen, niet de straatnaam.
async function fetchAdres(postcode, huisnummer) {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${postcode}+huisnummer:${huisnummer}&fq=type:adres&fl=weergavenaam,straatnaam,huisnummer,woonplaatsnaam,postcode&rows=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    if (
      doc.postcode !== postcode ||
      String(doc.huisnummer) !== String(huisnummer)
    ) {
      return null; // PDOK gaf 'best match' terug, niet ons exacte adres
    }
    return {
      weergavenaam: doc.weergavenaam,
      straatnaam: doc.straatnaam,
      huisnummer: String(doc.huisnummer),
      postcode: doc.postcode,
      plaats: doc.woonplaatsnaam,
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [klussen, setKlussen] = useState([]);
  const [titel, setTitel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [categorie, setCategorie] = useState("");
  const [voorkeurVakmanType, setVoorkeurVakmanType] = useState(""); // "" = beide
  const [bezig, setBezig] = useState(false);
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [gekozenCategorie, setGekozenCategorie] = useState("");
  const [categorieAangeraakt, setCategorieAangeraakt] = useState(false);
  const [stap, setStap] = useState(1);
  const [postcodeStatus, setPostcodeStatus] = useState({ state: "leeg" });
  const [trefwoorden, setTrefwoorden] = useState([]);
  const [huidigeUser, setHuidigeUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    haalKlussenOp();
    haalTrefwoordenOp();
    haalUserOp();
  }, []);

  useEffect(() => {
    if (categorieAangeraakt) return;
    const gevonden = detectCategorie(titel, trefwoorden);
    if (gevonden) setCategorie(gevonden);
  }, [titel, categorieAangeraakt, trefwoorden]);

  useEffect(() => {
    const schoonPc = postcode.trim().toUpperCase();
    const schoonHnr = huisnummer.trim();

    if (!schoonPc && !schoonHnr) {
      setPostcodeStatus({ state: "leeg" });
      return;
    }
    if (schoonPc.length < 6 || !schoonHnr) {
      setPostcodeStatus({ state: "typen" });
      return;
    }
    if (!POSTCODE_REGEX.test(schoonPc)) {
      setPostcodeStatus({ state: "fout" });
      return;
    }

    setPostcodeStatus({ state: "bezig" });
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const adres = await fetchAdres(schoonPc, schoonHnr);
      if (geannuleerd) return;
      setPostcodeStatus(adres ? { state: "ok", ...adres } : { state: "fout" });
    }, 250);

    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [postcode, huisnummer]);

  async function haalKlussenOp() {
    const reactie = await fetch("/api/klussen");
    const data = await reactie.json();
    setKlussen(data);
  }

  async function haalTrefwoordenOp() {
    const reactie = await fetch("/api/trefwoorden");
    const data = await reactie.json();
    setTrefwoorden(data);
  }

  async function haalUserOp() {
    const reactie = await fetch("/api/me");
    const data = await reactie.json();
    setHuidigeUser(data.user);
    setUserLoaded(true);
  }

  async function uitloggen() {
    await fetch("/api/logout", { method: "POST" });
    setHuidigeUser(null);
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
        huisnummer,
        straatnaam: postcodeStatus.straatnaam,
        plaats: postcodeStatus.plaats,
        categorie,
        voorkeurVakmanType: voorkeurVakmanType || null,
      }),
    });

    setTitel("");
    setPostcode("");
    setHuisnummer("");
    setCategorie("");
    setVoorkeurVakmanType("");
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

  const huidigeCategorie = detectCategorie(titel, trefwoorden);
  const stap1Geldig = postcodeStatus.state === "ok" && titel.trim().length > 0;

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const uniekeCategorieen = [
    ...new Set(klussen.map((k) => k.categorie).filter(Boolean)),
  ].sort();
  const gefilterdeKlussen = klussen.filter((k) => {
    if (gekozenPlaats && k.plaats !== gekozenPlaats) return false;
    if (gekozenCategorie && k.categorie !== gekozenCategorie) return false;
    return true;
  });

  const isVakman = huidigeUser?.rol === "vakman";
  const lijstHeading = isVakman ? "Openstaande opdrachten" : "Geplaatste klussen";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <header className="mb-10 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Werkmaximaal
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Vakmensen voor uw klus
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs">
            {huidigeUser ? (
              <>
                <span className="text-slate-500">
                  Ingelogd als{" "}
                  <span className="text-slate-900 font-medium">{huidigeUser.naam}</span>
                  <span className="text-slate-400">
                    {" "}({huidigeUser.rol})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={uitloggen}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/inloggen"
                  className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/registreren"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Registreren
                </Link>
              </>
            )}
            <Link
              href="/beheer"
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              Beheer →
            </Link>
          </div>
        </header>

        {userLoaded && !huidigeUser && (
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Plaats een klus
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Maak eerst een account aan om een klus te plaatsen. Bent u een
              vakman? Maak een vakman-account aan om straks leads te kopen.
            </p>
            <div className="flex gap-3">
              <Link
                href="/inloggen"
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
              >
                Inloggen
              </Link>
              <Link
                href="/registreren"
                className="bg-white border border-slate-300 hover:border-slate-900 text-slate-900 text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
              >
                Account aanmaken
              </Link>
            </div>
          </div>
        )}

        {userLoaded && huidigeUser && huidigeUser.rol !== "consument" && (
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
              Vakman-account
            </p>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Welkom, {huidigeUser.naam}
            </h2>
            <p className="text-sm text-slate-500">
              Klussen plaatsen is alleen voor consumenten. Hieronder ziet u alle
              openstaande opdrachten waar u een lead voor kunt kopen.
            </p>
          </div>
        )}

        {userLoaded && huidigeUser && huidigeUser.rol === "consument" && (
        <>
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
                  Postcode &amp; huisnummer
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase().slice(0, 6))}
                    maxLength={6}
                    placeholder="1234AB"
                    className={`w-32 px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors uppercase tracking-wider font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                    aria-invalid={postcodeStatus.state === "fout"}
                    aria-label="Postcode"
                  />
                  <input
                    type="text"
                    value={huisnummer}
                    onChange={(e) => setHuisnummer(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                    inputMode="numeric"
                    placeholder="12"
                    className={`w-20 px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                    aria-label="Huisnummer"
                  />
                </div>
                <div
                  className={`mt-2 px-3 py-2.5 bg-slate-50 border rounded-md flex items-center gap-2 text-sm ${
                    postcodeStatus.state === "fout"
                      ? "border-rose-300"
                      : "border-slate-200"
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
                      <span className="text-slate-700">{postcodeStatus.weergavenaam}</span>
                    </>
                  )}
                  {postcodeStatus.state === "bezig" && (
                    <span className="text-slate-400 text-xs animate-pulse">
                      Bezig met opzoeken...
                    </span>
                  )}
                  {postcodeStatus.state === "fout" && (
                    <span className="text-rose-600 text-xs">Adres niet gevonden</span>
                  )}
                  {(postcodeStatus.state === "leeg" || postcodeStatus.state === "typen") && (
                    <span className="text-slate-400 text-xs">
                      Het volledige adres verschijnt hier
                    </span>
                  )}
                </div>
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
                  {postcodeStatus.weergavenaam || `${postcode} ${huisnummer}, ${postcodeStatus.plaats}`}
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type vakman gewenst
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "", label: "Beide" },
                    { val: "professional", label: "Professional" },
                    { val: "hobbyist", label: "Hobbyist" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setVoorkeurVakmanType(opt.val)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-md border transition-colors ${
                        voorkeurVakmanType === opt.val
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:border-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Pro vs Hobbyist
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left font-normal py-1"></th>
                      <th className="text-center font-medium py-1 px-2">Pro</th>
                      <th className="text-center font-medium py-1 px-2">Hobbyist</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">KvK-geregistreerd</td>
                      <td className="text-center text-emerald-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Bedrijfsverzekering</td>
                      <td className="text-center text-emerald-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Garantie op werk</td>
                      <td className="text-center text-emerald-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Indicatieve prijs</td>
                      <td className="text-center text-slate-500">Markt</td>
                      <td className="text-center text-emerald-700">Goedkoper</td>
                    </tr>
                  </tbody>
                </table>
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
        </>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {lijstHeading} ({gefilterdeKlussen.length})
          </h2>

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
                    {huidigeUser && (klus.userId === huidigeUser.id || klus.userId === null) && (
                      <button
                        onClick={() => verwijderKlus(klus.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 hover:underline shrink-0 transition-colors"
                      >
                        Verwijderen
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {klus.straatnaam && <>{klus.straatnaam} {klus.huisnummer}, </>}
                    {!klus.straatnaam && klus.postcode && <>{klus.postcode}{klus.huisnummer ? ` ${klus.huisnummer}` : ""} · </>}
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
      </div>
    </div>
  );
}
