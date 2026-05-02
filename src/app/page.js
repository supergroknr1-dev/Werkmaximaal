"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hammer,
  ClipboardCheck,
  Shield,
  MapPin,
  Search,
  Wrench,
  Ruler,
  Home as HomeIcon,
  Sun,
  Plus,
  Minus,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { detectCategorie } from "@/lib/categorie-detect";

const PENDING_KEY = "werkmaximaal_pending_klus";
const AUTO_PLAATSEN_KEY = "werkmaximaal_auto_plaatsen";

// Twee-paden-sectie ("De Vakman" / "Handige Harrie") staat klaar maar
// is bewust verborgen tot we besluiten 'm publiek te tonen. Zet op
// true om beide CTA-blokken op de homepage te tonen.
const TOON_TWEE_PADEN = false;

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

// Fallback voor het allereerste paint vóór /api/categorieen geladen is.
// Wordt direct na mount overschreven door de live DB-lijst.
const FALLBACK_CATEGORIEEN = [
  "Schilder",
  "Loodgieter",
  "Klusjesman",
  "Tuinman",
  "Elektricien",
  "Timmerman",
  "Stratenmaker",
  "Anders",
];

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
  const router = useRouter();
  const [klussen, setKlussen] = useState([]);
  const [titel, setTitel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [categorie, setCategorie] = useState("");
  const [voorkeurVakmanType, setVoorkeurVakmanType] = useState(""); // "" = beide
  const [bezig, setBezig] = useState(false);
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [gekozenCategorie, setGekozenCategorie] = useState("");
  const [alleenWerkgebied, setAlleenWerkgebied] = useState(true);
  const [categorieAangeraakt, setCategorieAangeraakt] = useState(false);
  const [stap, setStap] = useState(1);
  const [postcodeStatus, setPostcodeStatus] = useState({ state: "leeg" });
  const [trefwoorden, setTrefwoorden] = useState([]);
  const [categorieen, setCategorieen] = useState(FALLBACK_CATEGORIEEN);
  const [huidigeUser, setHuidigeUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [hobbyistInschakeld, setHobbyistInschakeld] = useState(true);
  const [stats, setStats] = useState(null);
  const [zoekTekst, setZoekTekst] = useState("");
  const [zoekCategorie, setZoekCategorie] = useState("");
  const [zoekCategorieAangeraakt, setZoekCategorieAangeraakt] = useState(false);
  const [zoekt, setZoekt] = useState(false);
  // Cross-sell: bij sommige beroepen suggereren we een 2e vakman
  // (bv. Schilder → Stukadoor). Opt-in via toggle; bij submit komen
  // er dan 2 klussen die naar elkaar verwijzen.
  const [relatie, setRelatie] = useState(null);
  const [extraGekozen, setExtraGekozen] = useState(false);
  // Multi-klus ontleding: LLM splitst de omschrijving in 1+ klussen,
  // elk met eigen beroep. Bij submit worden N gelinkte klussen aangemaakt.
  const [klusLijst, setKlusLijst] = useState([]); // [{omschrijving, beroep}]
  const [ontleedt, setOntleedt] = useState(false);
  // Configurator-velden (optioneel, nu alleen relevant bij Schilder)
  const [oppervlakte, setOppervlakte] = useState("");
  const [binnenBuiten, setBinnenBuiten] = useState("");
  const [aantal, setAantal] = useState(0);
  const [urgentie, setUrgentie] = useState("");

  useEffect(() => {
    haalKlussenOp();
    haalTrefwoordenOp();
    haalUserOp();
    fetch("/api/instellingen")
      .then((r) => r.json())
      .then((d) => setHobbyistInschakeld(d.hobbyistInschakeld !== false))
      .catch(() => {});
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
    fetch("/api/categorieen")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setCategorieen(d.map((c) => c.naam));
        }
      })
      .catch(() => {});
    // Herstel een onafgemaakte klus uit sessionStorage (gebruiker ging
    // eerst inloggen/registreren). Velden worden gevuld; gebruiker
    // klikt zelf 'Volgende' / 'Plaats klus' om af te ronden — tenzij
    // AUTO_PLAATSEN_KEY is gezet, dan wordt de klus automatisch
    // geplaatst zodra alle gegevens beschikbaar zijn.
    if (typeof window !== "undefined") {
      try {
        const opgeslagen = sessionStorage.getItem(PENDING_KEY);
        if (opgeslagen) {
          const d = JSON.parse(opgeslagen);
          if (d.titel) setTitel(d.titel);
          if (d.postcode) setPostcode(d.postcode);
          if (d.huisnummer) setHuisnummer(d.huisnummer);
          if (d.categorie) {
            setCategorie(d.categorie);
            setCategorieAangeraakt(true);
          }
          if (d.voorkeurVakmanType) setVoorkeurVakmanType(d.voorkeurVakmanType);
          if (d.stap) setStap(d.stap);
        }
      } catch {
        // negeer corrupt JSON
      }
    }
  }, []);

  // Auto-plaatsen na login/registratie: zodra de gebruiker is geladen,
  // het pending-vlag is gezet, de klus-velden gevuld zijn en het adres
  // door PDOK is bevestigd, plaatsen we de klus zonder dat de gebruiker
  // nog op een knop hoeft te klikken.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const autoFlag = sessionStorage.getItem(AUTO_PLAATSEN_KEY);
    if (!autoFlag) return;
    if (!userLoaded || !huidigeUser || huidigeUser.rol !== "consument") return;
    if (!titel.trim() || !postcode || !huisnummer) return;
    if (postcodeStatus.state !== "ok") return;
    // Alles oké — direct vlag wegruimen om dubbele-submit te voorkomen
    sessionStorage.removeItem(AUTO_PLAATSEN_KEY);
    plaatsKlus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, huidigeUser, postcodeStatus.state, titel, postcode, huisnummer]);

  useEffect(() => {
    if (categorieAangeraakt) return;
    const gevonden = detectCategorie(titel, trefwoorden, categorieen);
    if (gevonden) setCategorie(gevonden);
  }, [titel, categorieAangeraakt, trefwoorden]);

  // Multi-klus ontleding op de "Omschrijving" — splitst automatisch in
  // 1+ klussen via LLM (gpt-4o-mini). 1500ms debounce omdat de LLM-call
  // duurder en trager is dan een embedding-call. Vervangt de oude
  // /api/zoek-categorie-fallback. Als ontleding 1 klus vindt, fungeert
  // het als single-detect; bij 2+ klussen verschijnt automatisch de
  // multi-klus lijst zodat de gebruiker ze ziet zonder een knop te klikken.
  useEffect(() => {
    if (categorieAangeraakt) return;
    if (!titel || titel.trim().length < 6) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setOntleedt(true);
      try {
        const res = await fetch("/api/ontleed-klus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tekst: titel }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.klussen) && data.klussen.length > 0 && !categorieAangeraakt) {
          setKlusLijst(data.klussen);
          setCategorie(data.klussen[0].beroep);
        }
      } catch {
        // abort of netwerkfout — laat staan
      } finally {
        setOntleedt(false);
      }
    }, 1500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [titel, categorieAangeraakt]);

  // Auto-detect tijdens typen is uit — gebruiker triggert zoek via
  // de "Volgende"-knop. Dit voorkomt flikkering en onnodige API-calls,
  // en geeft de gebruiker controle over wanneer er gezocht wordt.

  // Cross-sell: zodra een categorie gekozen is, kijk of er een
  // gerelateerd beroep is om voor te stellen.
  useEffect(() => {
    if (!categorie) {
      setRelatie(null);
      setExtraGekozen(false);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/beroep-relaties?categorie=${encodeURIComponent(categorie)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setRelatie(d.relatie ?? null))
      .catch(() => setRelatie(null));
    return () => ctrl.abort();
  }, [categorie]);

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

  // Admins horen niet op de publieke homepage — direct naar /admin
  useEffect(() => {
    if (userLoaded && huidigeUser?.rol === "admin" && huidigeUser?.isAdmin) {
      router.push("/admin");
    }
  }, [userLoaded, huidigeUser, router]);

  async function uitloggen() {
    await fetch("/api/logout", { method: "POST" });
    setHuidigeUser(null);
  }

  async function plaatsKlus(e) {
    if (e && e.preventDefault) e.preventDefault();

    // Niet ingelogd? Sla de huidige form-staat op in sessionStorage en
    // stuur de gebruiker naar inloggen — na succesvol inloggen of
    // registreren komen ze terug op /, waar de waarden weer in het
    // formulier verschijnen en ze kunnen klikken op 'Plaats klus'.
    if (!huidigeUser) {
      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            titel,
            postcode,
            huisnummer,
            // Straatnaam en plaats komen uit de PDOK-lookup; we
            // bewaren ze zodat /voltooien ze kan gebruiken om het
            // profiel van een nieuwe consument direct te vullen.
            straatnaam: postcodeStatus.straatnaam || "",
            plaats: postcodeStatus.plaats || "",
            categorie,
            voorkeurVakmanType,
            stap,
          })
        );
      } catch {
        // sessionStorage kan in private mode falen — dan gewoon door
      }
      router.push("/voltooien");
      return;
    }

    setBezig(true);

    const baseBody = {
      postcode,
      huisnummer,
      straatnaam: postcodeStatus.straatnaam,
      plaats: postcodeStatus.plaats,
      voorkeurVakmanType: voorkeurVakmanType || null,
      oppervlakte: oppervlakte ? parseInt(oppervlakte) : null,
      binnenBuiten: binnenBuiten || null,
      aantal: aantal > 0 ? aantal : null,
      urgentie: urgentie || null,
    };

    // Multi-klus modus: als de LLM-ontleding meerdere klussen heeft
    // gevonden, maak voor elke een aparte klus aan, gelinkt aan de eerste.
    if (klusLijst.length > 1) {
      const primair = await fetch("/api/klussen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseBody,
          titel: klusLijst[0].omschrijving || titel,
          categorie: klusLijst[0].beroep,
        }),
      }).then((r) => (r.ok ? r.json() : null));

      if (primair?.id) {
        for (let i = 1; i < klusLijst.length; i++) {
          await fetch("/api/klussen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...baseBody,
              titel: klusLijst[i].omschrijving || titel,
              categorie: klusLijst[i].beroep,
              gerelateerdeAanId: primair.id,
            }),
          });
        }
      }
    } else {
      // Enkel-klus modus: 1 klus + optioneel cross-sell extra.
      const primair = await fetch("/api/klussen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, titel, categorie }),
      }).then((r) => (r.ok ? r.json() : null));

      if (primair?.id && extraGekozen && relatie?.gerelateerdeNaam) {
        await fetch("/api/klussen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            titel: `${titel} — ${relatie.gerelateerdeNaam}`,
            categorie: relatie.gerelateerdeNaam,
            gerelateerdeAanId: primair.id,
          }),
        });
      }
    }

    // Klus geplaatst — onthouden hoeft niet meer
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {}

    setTitel("");
    setPostcode("");
    setHuisnummer("");
    setCategorie("");
    setVoorkeurVakmanType("");
    setCategorieAangeraakt(false);
    setRelatie(null);
    setExtraGekozen(false);
    setKlusLijst([]);
    setOppervlakte("");
    setBinnenBuiten("");
    setAantal(0);
    setUrgentie("");
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

  const huidigeCategorie = detectCategorie(titel, trefwoorden, categorieen);
  const stap1Geldig = postcodeStatus.state === "ok" && titel.trim().length > 0;

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const uniekeCategorieen = [
    ...new Set(klussen.map((k) => k.categorie).filter(Boolean)),
  ].sort();
  const isVakman = huidigeUser?.rol === "vakman";
  const heeftWerkgebied = !!huidigeUser?.heeftWerkgebied;
  const filterWerkgebiedActief = isVakman && heeftWerkgebied && alleenWerkgebied;
  const gefilterdeKlussen = klussen.filter((k) => {
    if (filterWerkgebiedActief && !k.inWerkgebied) return false;
    if (gekozenPlaats && k.plaats !== gekozenPlaats) return false;
    if (gekozenCategorie && k.categorie !== gekozenCategorie) return false;
    return true;
  });

  const lijstHeading = isVakman ? "Openstaande opdrachten" : "Mijn klussen";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <header className="mb-10 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-slate-900" />
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                W
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                  Werkmaximaal
                </h1>
                <p className="text-xs text-slate-500">Vakmannen voor uw klus</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {!huidigeUser && (
                <>
                  <Link
                    href="/inloggen"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-3 py-1.5 rounded-md transition-colors"
                  >
                    Inloggen
                  </Link>
                  <Link
                    href="/registreren"
                    className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
                  >
                    Registreren
                  </Link>
                </>
              )}
              {huidigeUser?.isAdmin && (
                <Link
                  href="/admin"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Admin →
                </Link>
              )}
            </div>
          </div>
        </header>

        {userLoaded && !huidigeUser?.isAdmin && (!huidigeUser || huidigeUser.rol === "consument") && (
          <section className="mb-10 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center gap-2">
              <Search size={16} strokeWidth={2} />
              <h3 className="text-sm font-semibold">Wat is uw klus?</h3>
            </div>
            <div className="p-5 md:p-6">
              <textarea
                value={zoekTekst}
                onChange={(e) => setZoekTekst(e.target.value)}
                placeholder="bijv: mijn wc spoelt niet door"
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-900 resize-none"
              />

              <button
                type="button"
                onClick={async () => {
                  if (!zoekTekst.trim() && !zoekCategorie) return;
                  let categorieResult = zoekCategorie;
                  // Als gebruiker een tekst heeft maar nog geen handmatige
                  // beroep-keuze: zoek de juiste vakman via semantic search.
                  if (zoekTekst.trim() && !zoekCategorie) {
                    setZoekt(true);
                    try {
                      const res = await fetch("/api/zoek-categorie", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tekst: zoekTekst }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.match && data.match.score >= 60) {
                          categorieResult = data.match.categorie;
                          setZoekCategorie(categorieResult);
                        }
                      }
                    } catch {
                      // netwerkfout — laat lege dropdown staan, gebruiker
                      // kiest zelf
                    }
                    setZoekt(false);
                  }
                  if (zoekTekst.trim()) setTitel(zoekTekst);
                  if (categorieResult) {
                    setCategorie(categorieResult);
                    setCategorieAangeraakt(true);
                  }
                  setTimeout(() => {
                    document
                      .getElementById("klus-plaatsen")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
                disabled={zoekt || (!zoekTekst.trim() && !zoekCategorie)}
                className="mt-5 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
              >
                {zoekt ? "Bezig met zoeken..." : "Volgende"}
              </button>
            </div>
          </section>
        )}

        {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="bg-white rounded-lg p-8 shadow-md text-center">
                <Hammer
                  className="w-10 h-10 text-orange-600 mx-auto mb-4"
                  strokeWidth={1.5}
                />
                <p className="text-5xl md:text-6xl font-bold text-orange-600 tracking-tight tabular-nums mb-3">
                  {stats.vakmannen.toLocaleString("nl-NL")}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Geverifieerde Vakmannen &amp; Handige Harries
                </p>
              </div>
              <div className="bg-white rounded-lg p-8 shadow-sm text-center border-t-4 border-orange-600">
                <ClipboardCheck
                  className="w-10 h-10 text-orange-600 mx-auto mb-4"
                  strokeWidth={1.5}
                />
                <p className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight tabular-nums mb-3">
                  {stats.klussen.toLocaleString("nl-NL")}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Klussen in database
                </p>
              </div>
            </div>
          )}

        {TOON_TWEE_PADEN && userLoaded && !huidigeUser && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <Link
              href="/registreren/vakman"
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg p-6 md:p-8 transition-colors flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                <Shield size={24} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold mb-1">De Vakman</h3>
                <p className="text-sm text-slate-300">
                  KvK-geregistreerd, met bedrijfsverzekering en garantie op
                  uitgevoerd werk.
                </p>
              </div>
            </Link>
            <Link
              href="/registreren/vakman"
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-6 md:p-8 transition-colors flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-md bg-orange-50 flex items-center justify-center shrink-0">
                <MapPin size={24} strokeWidth={1.5} className="text-orange-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Handige Harrie
                </h3>
                <p className="text-sm text-slate-500">
                  Buurtgenoot met handige skills. Vaak goedkoper en persoonlijk.
                </p>
              </div>
            </Link>
          </section>
        )}

        {userLoaded && huidigeUser?.rol === "vakman" && (
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

        {userLoaded && !huidigeUser?.isAdmin && (!huidigeUser || huidigeUser.rol === "consument") && (
        <>
        <div id="klus-plaatsen" className="flex items-center gap-3 mb-6 scroll-mt-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stap >= 1 ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-500"
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
                stap >= 2 ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-500"
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
                        className="w-4 h-4 text-orange-600 shrink-0"
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

              <div className="mb-6">
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

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Wrench size={14} className="text-orange-600" />
                    Welke vakmensen heeft u nodig?
                  </label>
                  <button
                    type="button"
                    disabled={!titel.trim() || ontleedt}
                    onClick={async () => {
                      setOntleedt(true);
                      try {
                        const res = await fetch("/api/ontleed-klus", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tekst: titel }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setKlusLijst(data.klussen || []);
                          if (data.klussen?.[0])
                            setCategorie(data.klussen[0].beroep);
                        }
                      } catch {}
                      setOntleedt(false);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 disabled:text-slate-400"
                  >
                    <Sparkles size={12} />
                    {ontleedt ? "Bezig..." : "Analyseer klus"}
                  </button>
                </div>

                {klusLijst.length > 0 ? (
                  <div className="space-y-2">
                    {klusLijst.map((k, i) => (
                      <div
                        key={i}
                        className="bg-orange-50 border-2 border-orange-300 border-l-[6px] rounded-md px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <select
                            value={k.beroep}
                            onChange={(e) => {
                              const nieuw = [...klusLijst];
                              nieuw[i] = { ...k, beroep: e.target.value };
                              setKlusLijst(nieuw);
                              if (i === 0) setCategorie(e.target.value);
                              setCategorieAangeraakt(true);
                            }}
                            className="flex-1 px-2 py-1 bg-white border border-orange-300 rounded text-sm font-semibold text-slate-900 focus:outline-none focus:border-orange-600"
                          >
                            {categorieen.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const nieuw = klusLijst.filter((_, j) => j !== i);
                              setKlusLijst(nieuw);
                              if (nieuw.length > 0) setCategorie(nieuw[0].beroep);
                              else setCategorie("");
                            }}
                            className="text-slate-400 hover:text-rose-600 text-base leading-none px-1"
                            aria-label={`Verwijder klus ${i + 1}`}
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          value={k.omschrijving}
                          onChange={(e) => {
                            const nieuw = [...klusLijst];
                            nieuw[i] = { ...k, omschrijving: e.target.value };
                            setKlusLijst(nieuw);
                          }}
                          className="w-full ml-7 -mt-px px-2 py-1 bg-white/70 border border-transparent hover:border-orange-300 focus:border-orange-600 rounded text-xs text-slate-700 focus:outline-none transition-colors"
                          style={{ width: "calc(100% - 1.75rem)" }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setKlusLijst([
                          ...klusLijst,
                          { omschrijving: "", beroep: categorieen[0] || "" },
                        ]);
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Voeg klus toe
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={categorie}
                      onChange={(e) => {
                        setCategorie(e.target.value);
                        setCategorieAangeraakt(true);
                      }}
                      className={`w-full px-3 py-2.5 border-2 rounded-md text-sm focus:outline-none bg-white transition-colors ${
                        categorie && !categorieAangeraakt
                          ? "border-orange-500 focus:border-orange-600 bg-orange-50 ring-2 ring-orange-200"
                          : categorie
                          ? "border-orange-300 focus:border-orange-600"
                          : "border-slate-300 focus:border-slate-900"
                      }`}
                    >
                      <option value="">Kies een beroep...</option>
                      {categorieen.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Of klik <strong>Analyseer klus</strong> hierboven voor
                      meerdere vakmensen tegelijk.
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStap(2)}
                disabled={!stap1Geldig}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
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
                    {huidigeCategorie && !categorieAangeraakt
                      ? "(automatisch herkend, mag aangepast worden)"
                      : !categorie
                      ? "(optioneel)"
                      : ""}
                  </span>
                </label>
                {categorie ? (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-md p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                      <Check size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">
                        Gekozen categorie
                      </p>
                      <p className="text-lg font-semibold text-slate-900 leading-tight">
                        {categorie}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategorie("");
                        setCategorieAangeraakt(true);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 underline shrink-0"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
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
                )}
                <datalist id="categorieen-lijst">
                  {categorieen.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                {categorie && relatie && (
                  <div className="mt-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-orange-50 border-2 border-blue-300 border-l-[6px] border-l-blue-500 rounded-md shadow-sm">
                    <div className="flex items-start gap-3">
                      <Sparkles
                        size={20}
                        className="text-blue-600 shrink-0 mt-0.5"
                        strokeWidth={2.5}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-900 leading-tight">
                          Wist u dat? Bij {categorie} hebben klanten vaak ook
                          een <span className="text-orange-700">{relatie.gerelateerdeNaam}</span> nodig.
                        </p>
                        <p className="text-xs text-slate-700 mt-1 leading-snug">
                          {relatie.uitleg}
                        </p>
                        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={extraGekozen}
                            onChange={(e) => setExtraGekozen(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-2 focus:ring-orange-200"
                          />
                          <span className="text-sm font-medium text-slate-900">
                            Voeg {relatie.gerelateerdeNaam} toe aan mijn aanvraag
                          </span>
                        </label>
                        {extraGekozen && (
                          <p className="text-xs text-emerald-700 mt-1.5 ml-6 font-medium">
                            ✓ U ontvangt straks 2 aparte aanvragen — één voor {categorie} en één voor {relatie.gerelateerdeNaam}.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {categorie?.toLowerCase() === "schilder" && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-orange-600" />
                    Specificeer uw klus
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Ruler size={14} />
                        Oppervlakte
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={oppervlakte}
                          onChange={(e) => setOppervlakte(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-slate-900"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                          m²
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        Locatie
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: "binnen", label: "Binnen", Icon: HomeIcon },
                          { val: "buiten", label: "Buiten", Icon: Sun },
                          { val: "beide", label: "Beide", Icon: Hammer },
                        ].map(({ val, label, Icon }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setBinnenBuiten(
                                binnenBuiten === val ? "" : val
                              )
                            }
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md border text-[11px] font-medium transition-colors ${
                              binnenBuiten === val
                                ? "bg-orange-600 text-white border-orange-600"
                                : "bg-white text-slate-700 border-slate-300 hover:border-slate-900"
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        Aantal deuren
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAantal(Math.max(0, aantal - 1))}
                          className="w-9 h-9 rounded-md border border-slate-300 bg-white text-orange-600 hover:border-orange-600 flex items-center justify-center transition-colors"
                          aria-label="Eén minder"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={aantal}
                          onChange={(e) =>
                            setAantal(
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="flex-1 text-center border border-slate-300 rounded-md py-1.5 text-sm font-semibold bg-white focus:outline-none focus:border-slate-900 tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setAantal(aantal + 1)}
                          className="w-9 h-9 rounded-md border border-slate-300 bg-white text-orange-600 hover:border-orange-600 flex items-center justify-center transition-colors"
                          aria-label="Eén meer"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Clock size={14} />
                        Urgentie
                      </label>
                      <select
                        value={urgentie}
                        onChange={(e) => setUrgentie(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-slate-900"
                      >
                        <option value="">Kies wanneer</option>
                        <option value="spoed">Spoed (binnen 24u)</option>
                        <option value="deze-week">Deze week</option>
                        <option value="deze-maand">Deze maand</option>
                        <option value="geen-haast">Geen haast</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {hobbyistInschakeld && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type vakman gewenst
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "", label: "Beide" },
                    { val: "professional", label: "Vakman" },
                    { val: "hobbyist", label: "Handige Harrie" },
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
              )}

              {hobbyistInschakeld && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Vakman vs Handige Harrie
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left font-normal py-1"></th>
                      <th className="text-center font-medium py-1 px-2">Vakman</th>
                      <th className="text-center font-medium py-1 px-2">Handige Harrie</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">KvK-geregistreerd</td>
                      <td className="text-center text-orange-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Bedrijfsverzekering</td>
                      <td className="text-center text-orange-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Garantie op werk</td>
                      <td className="text-center text-orange-600">✓</td>
                      <td className="text-center text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="py-1.5">Indicatieve prijs</td>
                      <td className="text-center text-slate-500">Markt</td>
                      <td className="text-center text-orange-700">Goedkoper</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              )}

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
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-sm font-medium py-3 rounded-md transition-colors"
                >
                  {bezig ? "Bezig..." : "Plaats klus"}
                </button>
              </div>
            </div>
          )}
        </form>
        </>
        )}

        {userLoaded && huidigeUser && (
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
        )}
      </div>
    </div>
  );
}
