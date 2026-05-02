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
  PaintBucket,
  Droplet,
  Zap,
  Leaf,
  Drill,
  Construction,
  Pickaxe,
  MessageSquare,
  UserCheck,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  ArrowRight,
  Star,
  Building,
  ClipboardList,
  Handshake,
  TrendingUp,
} from "lucide-react";

const PENDING_KEY = "werkmaximaal_pending_klus";
const AUTO_PLAATSEN_KEY = "werkmaximaal_auto_plaatsen";

// Twee-paden-sectie ("De Vakman" / "Handige Harrie") staat klaar maar
// is bewust verborgen tot we besluiten 'm publiek te tonen. Zet op
// true om beide CTA-blokken op de homepage te tonen.
const TOON_TWEE_PADEN = false;

// Populaire beroepen voor de hero-tegelrij. Onbekende beroepen vallen
// terug op Wrench. Klik op tegel = pre-fill categorie + scroll naar form.
const POPULAIRE_BEROEPEN = [
  { naam: "Schilder", Icon: PaintBucket, accent: "text-orange-600", bg: "bg-orange-50" },
  { naam: "Loodgieter", Icon: Droplet, accent: "text-sky-600", bg: "bg-sky-50" },
  { naam: "Elektricien", Icon: Zap, accent: "text-amber-500", bg: "bg-amber-50" },
  { naam: "Tuinman", Icon: Leaf, accent: "text-emerald-600", bg: "bg-emerald-50" },
  { naam: "Klusjesman", Icon: Hammer, accent: "text-slate-700", bg: "bg-slate-100" },
  { naam: "Timmerman", Icon: Drill, accent: "text-amber-700", bg: "bg-amber-50" },
  { naam: "Stratenmaker", Icon: Construction, accent: "text-stone-600", bg: "bg-stone-100" },
  { naam: "Dakdekker", Icon: HomeIcon, accent: "text-rose-600", bg: "bg-rose-50" },
];

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

// Count-up van 0 → target zodra het element in beeld komt. Gebruikt
// IntersectionObserver + requestAnimationFrame, geen externe library.
// Callback-ref via setNode zodat we ook werken als het element pas
// later mount (bv. omdat een ouder component conditional rendert).
function useCountUp(target, duration = 1400) {
  const [waarde, setWaarde] = useState(0);
  const [gestart, setGestart] = useState(false);
  const [node, setNode] = useState(null);

  useEffect(() => {
    if (!node || gestart) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setGestart(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, gestart]);

  useEffect(() => {
    if (!gestart || target == null) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setWaarde(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gestart, target, duration]);

  return [setNode, waarde];
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

  // Count-up refs voor de stat-tegels
  const [vakRef, vakValue] = useCountUp(stats?.vakmannen ?? 0);
  const [klusRef, klusValue] = useCountUp(stats?.klussen ?? 0);
  const beroepenAantal = categorieen?.length || 0;
  const [berRef, berValue] = useCountUp(beroepenAantal);

  useEffect(() => {
    haalKlussenOp();
    // Bundled init: 1 round-trip i.p.v. 4 (me + stats + instellingen + categorieen).
    // Trefwoorden client-side niet meer nodig — LLM-ontleding doet matching server-side.
    fetch("/api/init")
      .then((r) => r.json())
      .then((d) => {
        setHuidigeUser(d.user || null);
        setUserLoaded(true);
        if (d.stats) setStats(d.stats);
        if (d.instellingen)
          setHobbyistInschakeld(d.instellingen.hobbyistInschakeld !== false);
        if (Array.isArray(d.categorieen) && d.categorieen.length > 0) {
          setCategorieen(d.categorieen.map((c) => c.naam));
        }
      })
      .catch(() => {
        setUserLoaded(true);
      });
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

  // Klik op een populair-beroep tegel: pre-fill categorie + scroll naar
  // het stappen-form. Slaat de smart-input over (de gebruiker weet al
  // welke vakman ze nodig hebben).
  function kiesPopulairBeroep(beroep) {
    setCategorie(beroep);
    setCategorieAangeraakt(true);
    setKlusLijst([]); // reset eventuele eerdere multi-klus ontleding
    setStap(1);
    setTimeout(() => {
      document
        .getElementById("klus-plaatsen")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function startSmartZoek() {
    if (!zoekTekst.trim() && !zoekCategorie) return;
    let categorieResult = zoekCategorie;
    // Multi-klus ontleding: als gebruiker een tekst heeft, vraag
    // de LLM om 1+ klussen te identificeren — dezelfde flow als
    // op stap-1 form. Resultaat: meerdere klussen zichtbaar
    // wanneer dat gepast is.
    if (zoekTekst.trim() && !zoekCategorie) {
      setZoekt(true);
      try {
        const res = await fetch("/api/ontleed-klus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tekst: zoekTekst }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.klussen) && data.klussen.length > 0) {
            setKlusLijst(data.klussen);
            categorieResult = data.klussen[0].beroep;
            setZoekCategorie(categorieResult);
          }
        }
      } catch {
        // netwerkfout — laat dropdown leeg, gebruiker kiest zelf
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
  }

  const stap1Geldig = postcodeStatus.state === "ok" && titel.trim().length > 0;

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const uniekeCategorieen = [
    ...new Set(klussen.map((k) => k.categorie).filter(Boolean)),
  ].sort();
  const isVakman = huidigeUser?.rol === "vakman";
  const isConsumentOfAnoniem =
    !huidigeUser?.isAdmin && (!huidigeUser || huidigeUser.rol === "consument");
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
    <div className="min-h-screen bg-white">
      {/* === HERO === full-bleed donker met subtiele oranje glow.
          Top-bar (logo + login) zweeft erbovenop. Tweekoloms layout
          op desktop: marketing-tekst links, smart-input wit kaartje
          rechts (of vakman-CTA voor ingelogde vakmannen). */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white">
        {/* Decoratieve gradient-blobs voor diepte */}
        <div className="pointer-events-none absolute -top-40 -right-32 w-[36rem] h-[36rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-orange-600/10 blur-3xl" />
        {/* Fijne grid-overlay (alleen zichtbaar bij genoeg contrast) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top-bar met logo + login */}
        <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-lg shadow-orange-900/30">
                W
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight leading-tight">
                  Werkmaximaal
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Vakmannen voor uw klus
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              {!huidigeUser && userLoaded && (
                <>
                  <Link
                    href="/registreren"
                    className="hidden sm:inline-block text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Registreren
                  </Link>
                  <Link
                    href="/inloggen"
                    className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-4 py-2 rounded-md transition-colors"
                  >
                    Inloggen
                  </Link>
                </>
              )}
              {huidigeUser?.isAdmin && (
                <Link
                  href="/admin"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Admin →
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* LINKS: marketing-pitch */}
            <div className="lg:col-span-6 xl:col-span-5">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/15 text-orange-200 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                <Sparkles size={12} />
                Slim matchen met AI
              </span>

              <h2 className="mt-5 text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.05]">
                Vind de juiste{" "}
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                  vakman
                </span>{" "}
                voor elke klus
              </h2>

              <p className="mt-5 text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
                Beschrijf uw klus in eigen woorden — onze AI herkent precies
                welke vakman u nodig heeft. Plaats uw aanvraag in onder een
                minuut en ontvang reacties uit uw buurt.
              </p>

              {/* Trust pills onder de pitch */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-400" />
                  KvK-geverifieerd
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard size={14} className="text-orange-400" />
                  Veilig via iDEAL
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-orange-400" />
                  In heel Nederland
                </span>
              </div>
            </div>

            {/* RECHTS: smart-input (anon/consument) of vakman-CTA */}
            <div className="lg:col-span-6 xl:col-span-7">
              {userLoaded && isVakman ? (
                <VakmanHeroCard naam={huidigeUser?.naam} />
              ) : (
                <SmartInputCard
                  zoekTekst={zoekTekst}
                  setZoekTekst={setZoekTekst}
                  zoekt={zoekt}
                  zoekCategorie={zoekCategorie}
                  onSubmit={startSmartZoek}
                />
              )}
            </div>
          </div>
        </div>

        {/* Soft blend naar wit onder de hero */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* === POPULAIRE BEROEPEN === slight overlap met hero via -mt */}
      {isConsumentOfAnoniem && (
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 p-5 md:p-7">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 tracking-tight">
                  Of kies direct een vakman
                </h3>
                <p className="text-xs md:text-sm text-slate-500">
                  Klik op een beroep om uw klus snel te plaatsen.
                </p>
              </div>
              <span className="text-xs text-slate-400 hidden md:inline">
                {beroepenAantal}+ beroepen beschikbaar
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
              {POPULAIRE_BEROEPEN.map(({ naam, Icon, accent, bg }) => (
                <button
                  key={naam}
                  type="button"
                  onClick={() => kiesPopulairBeroep(naam)}
                  className="group relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className={`w-11 h-11 md:w-12 md:h-12 rounded-lg ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={22} className={accent} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs md:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                    {naam}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === STATS === drie cards met count-up */}
      {stats && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <StatCard
              tellerRef={vakRef}
              waarde={vakValue}
              eind={stats.vakmannen}
              label="Geverifieerde vakmannen"
              sublabel="& Handige Harries"
              Icon={Hammer}
              variant="orange-fill"
            />
            <StatCard
              tellerRef={klusRef}
              waarde={klusValue}
              eind={stats.klussen}
              label="Klussen geplaatst"
              sublabel="op het platform"
              Icon={ClipboardCheck}
              variant="white"
            />
            <StatCard
              tellerRef={berRef}
              waarde={berValue}
              eind={beroepenAantal}
              label="Beroepen beschikbaar"
              sublabel="van schilder tot dakdekker"
              Icon={Building}
              variant="dark"
            />
          </div>
        </section>
      )}

      {/* === HOE WERKT HET === drie stappen met verbindingslijn */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600 mb-3">
            Hoe werkt het
          </span>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            In drie stappen naar de juiste vakman
          </h3>
          <p className="mt-3 text-slate-500 text-base max-w-xl mx-auto">
            Geen telefonisch rondbellen, geen offertes opvragen — gewoon
            beschrijven wat u nodig heeft en wij doen de rest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 relative">
          {/* dunne verbindingslijn op desktop */}
          <div className="hidden md:block absolute top-12 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />

          <Stap
            nr={1}
            Icon={ClipboardList}
            titel="Beschrijf uw klus"
            tekst="Vul postcode in en omschrijf wat u nodig heeft. Onze AI herkent automatisch welke vakman bij uw klus past."
          />
          <Stap
            nr={2}
            Icon={MessageSquare}
            titel="Ontvang reacties"
            tekst="Vakmannen uit uw werkgebied reageren met hun aanbod. U vergelijkt prijs, beoordelingen en portfolio."
          />
          <Stap
            nr={3}
            Icon={Handshake}
            titel="Kies en regel"
            tekst="Kies de vakman die het beste past. Stuur direct berichten en maak afspraken — alles in één omgeving."
          />
        </div>
      </section>

      {/* === WAAROM WERKMAXIMAAL === trust-bar */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Waarom Werkmaximaal
            </h3>
            <p className="mt-2 text-slate-500 text-sm md:text-base">
              Een platform dat aan uw kant staat — voor klant én vakman.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <TrustItem
              Icon={ShieldCheck}
              titel="KvK-geverifieerd"
              tekst="Iedere geregistreerde vakman heeft een geldig KvK-nummer."
            />
            <TrustItem
              Icon={CreditCard}
              titel="Veilig betalen"
              tekst="Leads via iDEAL, geen voorschotten of verborgen kosten."
            />
            <TrustItem
              Icon={MessageSquare}
              titel="Direct contact"
              tekst="Chat één-op-één met de vakman vanaf het eerste bericht."
            />
            <TrustItem
              Icon={BadgeCheck}
              titel="Open en eerlijk"
              tekst="Cijfers en reviews zoals ze zijn — zonder opgepoetste plaatjes."
            />
          </div>
        </div>
      </section>

      {/* === Twee-paden CTA (achter feature-flag) === */}
      {TOON_TWEE_PADEN && userLoaded && !huidigeUser && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/registreren/vakman"
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-6 md:p-8 transition-colors flex items-start gap-4"
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
              className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-6 md:p-8 transition-colors flex items-start gap-4"
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
          </div>
        </section>
      )}

      {/* === STAP-FORM (alleen voor consument/anon) en KLUSSENLIJST === */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {userLoaded && isVakman && (
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

        {userLoaded && isConsumentOfAnoniem && (
          <>
            <div
              id="klus-plaatsen"
              className="flex items-center gap-3 mb-6 scroll-mt-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    stap >= 1
                      ? "bg-orange-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  1
                </span>
                <span
                  className={`text-sm ${
                    stap === 1 ? "font-medium text-slate-900" : "text-slate-500"
                  }`}
                >
                  Uw klus
                </span>
              </div>
              <div className="h-px w-10 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    stap >= 2
                      ? "bg-orange-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-sm ${
                    stap === 2 ? "font-medium text-slate-900" : "text-slate-500"
                  }`}
                >
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
                    Vul uw postcode in en omschrijf de klus. Wij zoeken een
                    geschikte vakman in uw buurt.
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Postcode &amp; huisnummer
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={postcode}
                        onChange={(e) =>
                          setPostcode(e.target.value.toUpperCase().slice(0, 6))
                        }
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
                        onChange={(e) =>
                          setHuisnummer(
                            e.target.value.replace(/[^0-9]/g, "").slice(0, 5)
                          )
                        }
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-slate-700">
                            {postcodeStatus.weergavenaam}
                          </span>
                        </>
                      )}
                      {postcodeStatus.state === "bezig" && (
                        <span className="text-slate-400 text-xs animate-pulse">
                          Bezig met opzoeken...
                        </span>
                      )}
                      {postcodeStatus.state === "fout" && (
                        <span className="text-rose-600 text-xs">
                          Adres niet gevonden
                        </span>
                      )}
                      {(postcodeStatus.state === "leeg" ||
                        postcodeStatus.state === "typen") && (
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
                                  const nieuw = klusLijst.filter(
                                    (_, j) => j !== i
                                  );
                                  setKlusLijst(nieuw);
                                  if (nieuw.length > 0)
                                    setCategorie(nieuw[0].beroep);
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
                                nieuw[i] = {
                                  ...k,
                                  omschrijving: e.target.value,
                                };
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
                              {
                                omschrijving: "",
                                beroep: categorieen[0] || "",
                              },
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
                          Of klik <strong>Analyseer klus</strong> hierboven
                          voor meerdere vakmensen tegelijk.
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
                      {postcodeStatus.weergavenaam ||
                        `${postcode} ${huisnummer}, ${postcodeStatus.plaats}`}
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
                        {categorie && !categorieAangeraakt
                          ? "(automatisch herkend, mag aangepast worden)"
                          : !categorie
                          ? "(optioneel)"
                          : ""}
                      </span>
                    </label>
                    {categorie ? (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-md p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                          <Check
                            size={20}
                            className="text-white"
                            strokeWidth={3}
                          />
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
                              Wist u dat? Bij {categorie} hebben klanten vaak
                              ook een{" "}
                              <span className="text-orange-700">
                                {relatie.gerelateerdeNaam}
                              </span>{" "}
                              nodig.
                            </p>
                            <p className="text-xs text-slate-700 mt-1 leading-snug">
                              {relatie.uitleg}
                            </p>
                            <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={extraGekozen}
                                onChange={(e) =>
                                  setExtraGekozen(e.target.checked)
                                }
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-2 focus:ring-orange-200"
                              />
                              <span className="text-sm font-medium text-slate-900">
                                Voeg {relatie.gerelateerdeNaam} toe aan mijn
                                aanvraag
                              </span>
                            </label>
                            {extraGekozen && (
                              <p className="text-xs text-emerald-700 mt-1.5 ml-6 font-medium">
                                ✓ U ontvangt straks 2 aparte aanvragen — één
                                voor {categorie} en één voor{" "}
                                {relatie.gerelateerdeNaam}.
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
                              onClick={() =>
                                setAantal(Math.max(0, aantal - 1))
                              }
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
                            <th className="text-center font-medium py-1 px-2">
                              Vakman
                            </th>
                            <th className="text-center font-medium py-1 px-2">
                              Handige Harrie
                            </th>
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
                            <td className="text-center text-slate-500">
                              Markt
                            </td>
                            <td className="text-center text-orange-700">
                              Goedkoper
                            </td>
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
                      {huidigeUser &&
                        (klus.userId === huidigeUser.id ||
                          klus.userId === null) && (
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
        )}
      </div>
    </div>
  );
}

// === Sub-components ===

function SmartInputCard({
  zoekTekst,
  setZoekTekst,
  zoekt,
  zoekCategorie,
  onSubmit,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-950/40 ring-1 ring-white/20 overflow-hidden">
      <div className="px-5 md:px-6 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center gap-2 border-b border-slate-700">
        <div className="w-7 h-7 rounded-md bg-orange-500/20 flex items-center justify-center">
          <Search size={14} className="text-orange-300" />
        </div>
        <h3 className="text-sm font-semibold">Wat is uw klus?</h3>
        <span className="ml-auto text-[10px] text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">
          Stap 1 van 2
        </span>
      </div>
      <div className="p-5 md:p-6">
        <textarea
          value={zoekTekst}
          onChange={(e) => setZoekTekst(e.target.value)}
          placeholder="bijv: mijn wc spoelt niet door, of voordeur kapot en lekkage in keuken"
          rows={4}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 resize-none transition-all"
        />

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Sparkles size={12} className="text-orange-500" />
          <span>
            Onze AI splitst meerdere klussen automatisch in losse aanvragen.
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={zoekt || (!zoekTekst.trim() && !zoekCategorie)}
          className="mt-5 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm md:text-base font-semibold py-3.5 rounded-lg transition-colors relative overflow-hidden inline-flex items-center justify-center gap-2"
        >
          {/* Progress-bar overlay tijdens LLM-call (~2-3s).
              Animeert van 0% naar 95% breed in 3 sec; blijft daar
              hangen totdat de response binnen is en de knop snapt
              weer terug naar normale state. */}
          <span
            className="absolute inset-y-0 left-0 bg-orange-300/60 transition-[width] ease-out"
            style={{
              width: zoekt ? "95%" : "0%",
              transitionDuration: zoekt ? "3000ms" : "200ms",
            }}
          />
          <span className="relative inline-flex items-center gap-2">
            {zoekt ? (
              "Bezig met analyseren..."
            ) : (
              <>
                Vind mijn vakman <ArrowRight size={16} />
              </>
            )}
          </span>
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          Gratis &amp; vrijblijvend · Geen account nodig om te beginnen
        </p>
      </div>
    </div>
  );
}

function VakmanHeroCard({ naam }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-950/40 ring-1 ring-white/20 p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600 font-semibold">
        Welkom terug
      </p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
        Hoi{naam ? `, ${naam}` : ""}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Bekijk de openstaande opdrachten en koop direct leads in uw werkgebied.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/mijn-leads"
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-3 rounded-lg text-center inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          Mijn leads <ArrowRight size={14} />
        </Link>
        <Link
          href="/profiel"
          className="bg-white border border-slate-200 hover:border-slate-400 text-slate-900 text-sm font-semibold px-4 py-3 rounded-lg text-center transition-colors"
        >
          Mijn profiel
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  tellerRef,
  waarde,
  eind,
  label,
  sublabel,
  Icon,
  variant = "white",
}) {
  const styles =
    variant === "orange-fill"
      ? {
          bg: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
          iconBg: "bg-white/20",
          iconColor: "text-white",
          number: "text-white",
          label: "text-white",
          sublabel: "text-orange-100",
        }
      : variant === "dark"
      ? {
          bg: "bg-slate-900 text-white",
          iconBg: "bg-orange-500/20",
          iconColor: "text-orange-400",
          number: "text-white",
          label: "text-white",
          sublabel: "text-slate-400",
        }
      : {
          bg: "bg-white border border-slate-200",
          iconBg: "bg-orange-50",
          iconColor: "text-orange-600",
          number: "text-slate-900",
          label: "text-slate-900",
          sublabel: "text-slate-500",
        };
  return (
    <div
      ref={tellerRef}
      className={`relative overflow-hidden rounded-2xl p-6 md:p-7 shadow-sm ${styles.bg}`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center mb-4`}
      >
        <Icon size={22} className={styles.iconColor} strokeWidth={1.8} />
      </div>
      <p
        className={`text-4xl md:text-5xl font-bold tracking-tight tabular-nums ${styles.number}`}
      >
        {(waarde || 0).toLocaleString("nl-NL")}
      </p>
      <p className={`mt-2 text-sm font-semibold ${styles.label}`}>{label}</p>
      <p className={`text-xs ${styles.sublabel}`}>{sublabel}</p>
    </div>
  );
}

function Stap({ nr, Icon, titel, tekst }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl p-6 md:p-7 hover:border-orange-300 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-200">
            <Icon size={24} strokeWidth={1.8} />
          </div>
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
            {nr}
          </span>
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-slate-900 leading-tight">
            {titel}
          </h4>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            {tekst}
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ Icon, titel, tekst }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
        <Icon size={20} className="text-orange-600" strokeWidth={1.8} />
      </div>
      <h4 className="text-sm md:text-base font-semibold text-slate-900">
        {titel}
      </h4>
      <p className="mt-1 text-xs md:text-sm text-slate-500 leading-relaxed">
        {tekst}
      </p>
    </div>
  );
}
