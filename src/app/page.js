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
  Sparkles,
  PaintBucket,
  Droplet,
  Zap,
  Leaf,
  Drill,
  Construction,
  Home as HomeIcon,
  MessageSquare,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  ArrowRight,
  Building,
  ClipboardList,
  Handshake,
} from "lucide-react";

const HANDOFF_KEY = "werkmaximaal_aanvraag_handoff";

// Twee-paden-sectie ("De Vakman" / "Handige Harrie") staat klaar maar
// is bewust verborgen tot we besluiten 'm publiek te tonen. Zet op
// true om beide CTA-blokken op de homepage te tonen.
const TOON_TWEE_PADEN = false;

// Populaire beroepen voor de hero-tegelrij. Onbekende beroepen vallen
// terug op Wrench. Klik op tegel = handoff naar /aanvraag met
// pre-filled categorie.
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
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [gekozenCategorie, setGekozenCategorie] = useState("");
  const [alleenWerkgebied, setAlleenWerkgebied] = useState(true);
  const [categorieen, setCategorieen] = useState([]);
  const [huidigeUser, setHuidigeUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [stats, setStats] = useState(null);
  const [zoekTekst, setZoekTekst] = useState("");
  const [zoekt, setZoekt] = useState(false);

  // Count-up refs voor de stat-tegels
  const [vakRef, vakValue] = useCountUp(stats?.vakmannen ?? 0);
  const [klusRef, klusValue] = useCountUp(stats?.klussen ?? 0);
  const beroepenAantal = categorieen?.length || 0;
  const [berRef, berValue] = useCountUp(beroepenAantal);

  useEffect(() => {
    haalKlussenOp();
    fetch("/api/init")
      .then((r) => r.json())
      .then((d) => {
        setHuidigeUser(d.user || null);
        setUserLoaded(true);
        if (d.stats) setStats(d.stats);
        if (Array.isArray(d.categorieen) && d.categorieen.length > 0) {
          setCategorieen(d.categorieen.map((c) => c.naam));
        }
      })
      .catch(() => {
        setUserLoaded(true);
      });
  }, []);

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

  async function verwijderKlus(id) {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    haalKlussenOp();
  }

  // Klik op een populair-beroep tegel: pre-fill categorie + navigeer
  // naar /aanvraag. De gebruiker komt direct in de stap 1-form terecht
  // met het beroep al ingevuld.
  function kiesPopulairBeroep(beroep) {
    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ categorie: beroep })
      );
    } catch {}
    router.push("/aanvraag");
  }

  // Smart-input handler: doe LLM-ontleding, sla resultaat op in
  // sessionStorage, navigeer naar /aanvraag. Het is bewust dat we de
  // LLM-call hier doen (en niet op /aanvraag) zodat de gebruiker tijdens
  // het laden de feedback van de progress-bar ziet op dezelfde plek.
  async function startSmartZoek() {
    if (!zoekTekst.trim()) return;
    setZoekt(true);
    let categorieResult = "";
    let klusLijstResult = [];
    try {
      const res = await fetch("/api/ontleed-klus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: zoekTekst }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.klussen) && data.klussen.length > 0) {
          klusLijstResult = data.klussen;
          categorieResult = data.klussen[0].beroep;
        }
      }
    } catch {
      // netwerkfout — gebruiker kiest categorie op /aanvraag
    }

    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({
          titel: zoekTekst.trim(),
          categorie: categorieResult,
          klusLijst: klusLijstResult,
        })
      );
    } catch {}

    setZoekt(false);
    router.push("/aanvraag");
  }

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
              label="Geverifieerde vakmannen"
              sublabel="& Handige Harries"
              Icon={Hammer}
              variant="orange-fill"
            />
            <StatCard
              tellerRef={klusRef}
              waarde={klusValue}
              label="Klussen geplaatst"
              sublabel="op het platform"
              Icon={ClipboardCheck}
              variant="white"
            />
            <StatCard
              tellerRef={berRef}
              waarde={berValue}
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

      {/* === KLUSSENLIJST (alleen voor ingelogde gebruikers) === */}
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

function SmartInputCard({ zoekTekst, setZoekTekst, zoekt, onSubmit }) {
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
          disabled={zoekt || !zoekTekst.trim()}
          className="mt-5 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm md:text-base font-semibold py-3.5 rounded-lg transition-colors relative overflow-hidden inline-flex items-center justify-center gap-2"
        >
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

function StatCard({ tellerRef, waarde, label, sublabel, Icon, variant = "white" }) {
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
