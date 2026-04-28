"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { POSTCODE_REGEX, searchPlaatsen } from "../../../lib/pdok";
import WachtwoordVeld from "../../../components/WachtwoordVeld";
import SpamVelden, { useSpamVelden } from "../../../components/SpamVelden";

async function fetchPlaats(postcode) {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${postcode}&fl=woonplaatsnaam&rows=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.response?.docs?.[0]?.woonplaatsnaam ?? null;
  } catch {
    return null;
  }
}

export default function RegistrerenVakmanPage() {
  const spam = useSpamVelden();
  const [naam, setNaam] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [kvkNummer, setKvkNummer] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [werkafstand, setWerkafstand] = useState("25");
  const [regioPostcode, setRegioPostcode] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [postcodeStatus, setPostcodeStatus] = useState({ state: "leeg" });
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [succes, setSucces] = useState(false);
  const [vakmanType, setVakmanType] = useState(null); // "professional" of "hobbyist"
  const [disclaimerAkkoord, setDisclaimerAkkoord] = useState(false);
  const [kvkUittrekselUrl, setKvkUittrekselUrl] = useState("");
  const [kvkUittrekselNaam, setKvkUittrekselNaam] = useState("");
  const [kvkStatus, setKvkStatus] = useState({ state: "leeg" });
  const [hobbyistInschakeld, setHobbyistInschakeld] = useState(true);
  // Werkgebied: postcode of plaats
  const [regioType, setRegioType] = useState("postcode"); // "postcode" | "plaats"
  const [regioPlaats, setRegioPlaats] = useState("");
  const [plaatsSuggesties, setPlaatsSuggesties] = useState([]);
  const [plaatsSuggestiesOpen, setPlaatsSuggestiesOpen] = useState(false);
  // KvK upload
  const [uploadBezig, setUploadBezig] = useState(false);
  const [uploadFout, setUploadFout] = useState(null);

  useEffect(() => {
    fetch("/api/instellingen")
      .then((r) => r.json())
      .then((d) => setHobbyistInschakeld(d.hobbyistInschakeld !== false))
      .catch(() => {});
  }, []);

  // PDOK-suggesties voor plaatsnaam (alleen wanneer plaats-modus actief)
  useEffect(() => {
    if (regioType !== "plaats") {
      setPlaatsSuggesties([]);
      return;
    }
    const q = (regioPlaats || "").trim();
    if (q.length < 2) {
      setPlaatsSuggesties([]);
      return;
    }
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const namen = await searchPlaatsen(q);
      if (!geannuleerd) setPlaatsSuggesties(namen);
    }, 250);
    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [regioPlaats, regioType]);

  useEffect(() => {
    const kvk = kvkNummer.trim();
    if (vakmanType !== "professional" || !/^\d{8}$/.test(kvk) || !bedrijfsnaam.trim()) {
      setKvkStatus({ state: "leeg" });
      return;
    }

    setKvkStatus({ state: "bezig" });
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kvk-check?kvk=${kvk}`);
        if (geannuleerd) return;
        const data = await res.json();
        if (!data.found) {
          setKvkStatus({ state: "niet-gevonden" });
        } else if (
          bedrijfsnaam.trim().toLowerCase() ===
          data.bedrijfsnaam.trim().toLowerCase()
        ) {
          setKvkStatus({ state: "match", officieleNaam: data.bedrijfsnaam });
        } else {
          setKvkStatus({ state: "mismatch", officieleNaam: data.bedrijfsnaam });
        }
      } catch {
        setKvkStatus({ state: "leeg" });
      }
    }, 300);
    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [kvkNummer, bedrijfsnaam, vakmanType]);

  useEffect(() => {
    const schoon = regioPostcode.trim().toUpperCase();
    if (!schoon) {
      setPostcodeStatus({ state: "leeg" });
      return;
    }
    if (schoon.length < 6) {
      setPostcodeStatus({ state: "typen" });
      return;
    }
    if (!POSTCODE_REGEX.test(schoon)) {
      setPostcodeStatus({ state: "fout" });
      return;
    }

    setPostcodeStatus({ state: "bezig" });
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const plaats = await fetchPlaats(schoon);
      if (geannuleerd) return;
      setPostcodeStatus(plaats ? { state: "ok", plaats } : { state: "fout" });
    }, 250);
    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [regioPostcode]);

  async function uploadKvk(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadFout(null);
    setUploadBezig(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/kvk-uittreksel", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload mislukt");
      setKvkUittrekselUrl(json.url);
      setKvkUittrekselNaam(json.naam || file.name);
    } catch (err) {
      setUploadFout(err.message);
    } finally {
      setUploadBezig(false);
    }
  }

  function verwijderKvk() {
    setKvkUittrekselUrl("");
    setKvkUittrekselNaam("");
  }

  async function registreer(e) {
    e.preventDefault();

    if (vakmanType === "hobbyist") {
      const ok = confirm(
        "Bevestig: € 25,00 eenmalig inschrijfgeld voor een Handige Harry-account.\n\n" +
          "Demo-modus — er wordt geen echt geld afgeschreven. Bij echte deploy " +
          "komt hier iDEAL via Mollie of Stripe."
      );
      if (!ok) return;
    }

    setBezig(true);
    setFoutmelding("");

    const res = await fetch("/api/registreren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rol: "vakman",
        vakmanType,
        naam,
        bedrijfsnaam,
        kvkNummer,
        kvkUittrekselUrl,
        kvkUittrekselNaam,
        telefoon,
        werkafstand: parseInt(werkafstand),
        regioPostcode:
          regioType === "postcode" ? regioPostcode.toUpperCase() : "",
        regioPlaats: regioType === "plaats" ? regioPlaats : "",
        email,
        wachtwoord,
        disclaimerAkkoord,
        ...spam.body(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    setSucces(true);
    setBezig(false);
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12 md:py-16">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Account aangemaakt
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              U kunt nu inloggen met uw e-mail en wachtwoord.
            </p>
            <Link
              href="/inloggen"
              className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              Naar inloggen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const postcodeGeldig = postcodeStatus.state === "ok";
  const werkgebiedGeldig =
    regioType === "postcode"
      ? postcodeGeldig
      : regioPlaats.trim().length >= 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/registreren"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug
        </Link>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
            Zakelijk
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Registreren als vakman
          </h1>
          <p className="text-sm text-slate-500">
            Vul uw bedrijfs- en contactgegevens in om een account aan te maken.
          </p>
        </header>

        <form
          onSubmit={registreer}
          className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Welk type vakman bent u?
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setVakmanType("professional")}
                className={`text-left border-2 rounded-md p-3 text-xs transition-colors ${
                  vakmanType === "professional"
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <p className="font-semibold text-slate-900">
                    Vakman (Professional)
                  </p>
                  {vakmanType === "professional" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5">
                      ✓ Gekozen
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                      Gratis
                    </span>
                  )}
                </div>
                <ul className="space-y-1 text-slate-600 leading-relaxed">
                  <li>✓ KvK-geregistreerd bedrijf</li>
                  <li>✓ Bedrijfsverzekering + garantie op werk</li>
                  <li>✓ Gratis registratie (geen inschrijfgeld)</li>
                  <li>✓ Standaard lead-prijs</li>
                  <li>✓ Pipedrive-pipeline: Pro</li>
                </ul>
              </button>
              <button
                type="button"
                onClick={() => hobbyistInschakeld && setVakmanType("hobbyist")}
                disabled={!hobbyistInschakeld}
                className={`text-left border-2 rounded-md p-3 text-xs transition-colors ${
                  !hobbyistInschakeld
                    ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                    : vakmanType === "hobbyist"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <p className="font-semibold text-slate-900">
                    Buurtklusser (Hobbyist)
                  </p>
                  {vakmanType === "hobbyist" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5">
                      ✓ Gekozen
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                      {hobbyistInschakeld ? "€ 25 eenmalig" : "Uitgeschakeld"}
                    </span>
                  )}
                </div>
                {hobbyistInschakeld ? (
                  <ul className="space-y-1 text-slate-600 leading-relaxed">
                    <li>○ Geen KvK-plicht</li>
                    <li>○ Geen bedrijfsverzekering via platform</li>
                    <li>○ € 25 eenmalig inschrijfgeld</li>
                    <li>○ Betaalt het dubbele per lead</li>
                    <li>○ Pipedrive-pipeline: Hobbyist</li>
                  </ul>
                ) : (
                  <p className="text-slate-500 leading-relaxed">
                    Buurtklusser-registratie is op dit moment uitgeschakeld door
                    de beheerder.
                  </p>
                )}
              </button>
            </div>
          </div>

          {vakmanType && (
          <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {vakmanType === "hobbyist"
                ? "Schermnaam (wat klanten zien)"
                : "Volledige naam"}
            </label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              required
              autoComplete="name"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            {vakmanType === "hobbyist" && (
              <p className="text-xs text-slate-500 mt-1">
                Naam zoals klanten u op de site zien.
              </p>
            )}
            {vakmanType === "professional" && (
              <p className="text-xs text-slate-500 mt-1">
                Contactpersoon achter het bedrijf — uw bedrijfsnaam (hieronder)
                is wat klanten zien.
              </p>
            )}
          </div>

          {vakmanType === "professional" && (
          <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bedrijfsnaam
            </label>
            <input
              type="text"
              value={bedrijfsnaam}
              onChange={(e) => setBedrijfsnaam(e.target.value)}
              required
              autoComplete="organization"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              KvK-nummer
            </label>
            <input
              type="text"
              value={kvkNummer}
              onChange={(e) => setKvkNummer(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
              inputMode="numeric"
              placeholder="12345678"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">8 cijfers.</p>
          </div>

          {kvkStatus.state === "bezig" && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-500 animate-pulse">
              Bezig met KvK-controle...
            </div>
          )}
          {kvkStatus.state === "match" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-900 flex items-start gap-2">
              <svg
                className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                Match met KvK-register: <strong>{kvkStatus.officieleNaam}</strong>
              </span>
            </div>
          )}
          {kvkStatus.state === "mismatch" && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">⚠ Naam wijkt af van KvK</p>
              <p>
                Officiële naam volgens KvK:{" "}
                <strong>{kvkStatus.officieleNaam}</strong>. Controleer of u de
                bedrijfsnaam exact hebt overgenomen.
              </p>
            </div>
          )}
          {kvkStatus.state === "niet-gevonden" && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
              KvK-nummer niet gevonden in onze mock-database. Bij echte deploy
              wordt hier kvk.nl bevraagd.
            </div>
          )}

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              KvK-uittreksel{" "}
              <span className="text-slate-400 font-normal">(optioneel)</span>
            </span>
            {kvkUittrekselUrl ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                <a
                  href={kvkUittrekselUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-800 hover:underline truncate"
                >
                  ✓ {kvkUittrekselNaam || "Uittreksel bekijken"}
                </a>
                <button
                  type="button"
                  onClick={verwijderKvk}
                  className="text-[11px] text-rose-700 hover:text-rose-900 shrink-0"
                >
                  verwijder
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-1.5">
                PDF, JPG of PNG · max 5 MB. U kunt dit ook later toevoegen
                vanaf uw profiel.
              </p>
            )}
            <label
              className={`inline-flex items-center gap-2 mt-2 px-4 py-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                uploadBezig
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadBezig
                ? "Bezig met uploaden…"
                : kvkUittrekselUrl
                ? "Vervang bestand"
                : "Bestand kiezen"}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={uploadKvk}
                disabled={uploadBezig}
                className="sr-only"
              />
            </label>
            {uploadFout && (
              <p className="text-[11px] text-rose-700 mt-1">{uploadFout}</p>
            )}
          </div>
          </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telefoonnummer
            </label>
            <input
              type="tel"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
              required
              autoComplete="tel"
              placeholder="06 12345678"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Nederlands formaat (06… of +31…).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Werkgebied bepalen via
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setRegioType("postcode")}
                className={`text-xs px-3 py-2 rounded border transition-colors ${
                  regioType === "postcode"
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                Postcode (4 cijfers)
              </button>
              <button
                type="button"
                onClick={() => setRegioType("plaats")}
                className={`text-xs px-3 py-2 rounded border transition-colors ${
                  regioType === "plaats"
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                Plaats
              </button>
            </div>
            {regioType === "postcode" ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Postcode (regio van uw werkgebied)
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={regioPostcode}
                    onChange={(e) => setRegioPostcode(e.target.value.toUpperCase().slice(0, 6))}
                    maxLength={6}
                    required
                    placeholder="1234AB"
                    className={`w-32 px-3 py-2.5 bg-white border rounded-l-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors uppercase tracking-wider font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
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
                    {postcodeStatus.state === "bezig" && (
                      <span className="text-slate-400 text-xs animate-pulse">
                        Bezig met opzoeken...
                      </span>
                    )}
                    {postcodeStatus.state === "fout" && (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                    {(postcodeStatus.state === "leeg" || postcodeStatus.state === "typen") && (
                      <span className="text-slate-400 text-xs">Plaatsnaam verschijnt hier</span>
                    )}
                  </div>
                </div>
                {postcodeStatus.state === "fout" && (
                  <p className="text-sm text-rose-600 mt-2">Ongeldige postcode</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Plaats (regio van uw werkgebied)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regioPlaats}
                    onChange={(e) => {
                      setRegioPlaats(e.target.value);
                      setPlaatsSuggestiesOpen(true);
                    }}
                    onFocus={() => setPlaatsSuggestiesOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setPlaatsSuggestiesOpen(false), 150)
                    }
                    required
                    placeholder="Begin te typen, bv. Eindhoven"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
                  />
                  {plaatsSuggestiesOpen && plaatsSuggesties.length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-md max-h-60 overflow-y-auto">
                      {plaatsSuggesties.map((naam) => (
                        <li key={naam}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRegioPlaats(naam);
                              setPlaatsSuggesties([]);
                              setPlaatsSuggestiesOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            {naam}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Typ minimaal 2 letters voor suggesties uit de officiële
                  Nederlandse plaatsnamen-database (PDOK).
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Werkafstand (in km)
            </label>
            <input
              type="number"
              value={werkafstand}
              onChange={(e) => setWerkafstand(e.target.value)}
              required
              min={1}
              max={500}
              className="w-32 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Hoe ver bent u bereid te reizen voor een opdracht?
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Wachtwoord
            </label>
            <WachtwoordVeld
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Minstens 8 tekens.</p>
          </div>

          {vakmanType === "hobbyist" && (
            <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimerAkkoord}
                onChange={(e) => setDisclaimerAkkoord(e.target.checked)}
                required
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm text-slate-700">
                Ik begrijp dat ik werk op eigen risico en niet onder de
                bedrijfsverzekering van het platform val.
              </span>
            </label>
          )}

          <SpamVelden state={spam} />

          {foutmelding && (
            <p className="text-sm text-rose-600">{foutmelding}</p>
          )}

          <button
            type="submit"
            disabled={
              bezig ||
              !werkgebiedGeldig ||
              (vakmanType === "hobbyist" && !disclaimerAkkoord)
            }
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
          >
            {bezig ? "Bezig met registreren..." : "Account aanmaken"}
          </button>
          </>
          )}
        </form>
      </div>
    </div>
  );
}
