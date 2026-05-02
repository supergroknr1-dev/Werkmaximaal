// Server Component — geen "use client". Doet data-fetching server-side
// (geen client-side /api/init of /api/klussen meer voor anon visitors)
// en rendert de marketing-secties als statische HTML. Alleen de
// interactieve stukken (smart-input, populaire-beroepen, stat-tegels
// met count-up, klussenlijst) zijn client-islands.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  CreditCard,
  MapPin,
  ArrowRight,
  Shield,
  ClipboardList,
  MessageSquare,
  Handshake,
  BadgeCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getInstellingen } from "@/lib/instellingen";
import SmartInputCard from "@/components/home/SmartInputCard";
import PopulaireBeroepen from "@/components/home/PopulaireBeroepen";
import StatCard from "@/components/home/StatCard";
import KlussenLijst from "@/components/home/KlussenLijst";

// Twee-paden-sectie ("De Vakman" / "Handige Harrie") staat klaar maar
// is bewust verborgen tot we besluiten 'm publiek te tonen.
const TOON_TWEE_PADEN = false;

export default async function Home() {
  const user = await getCurrentUser();

  // Admins horen niet op de publieke homepage — direct naar /admin
  if (user?.isAdmin) {
    redirect("/admin");
  }

  // Server-side data ophalen (vervangt de client-side /api/init call).
  // Identieke logica als /api/init/route.js, maar zonder de round-trip.
  const instellingen = await getInstellingen();
  const [vakmannenLive, klussenLive, categorieen] = await Promise.all([
    instellingen.statsHandmatig
      ? Promise.resolve(0)
      : prisma.user.count({ where: { rol: "vakman" } }),
    instellingen.statsHandmatig
      ? Promise.resolve(0)
      : prisma.klus.count(),
    prisma.categorie.findMany({
      orderBy: [{ volgorde: "asc" }, { naam: "asc" }],
      select: { id: true, naam: true },
    }),
  ]);

  const vakmannen = instellingen.statsHandmatig
    ? instellingen.statsVakmannenWaarde ?? 0
    : vakmannenLive;
  const klussen = instellingen.statsHandmatig
    ? instellingen.statsKlussenWaarde ?? 0
    : klussenLive;

  // heeftWerkgebied wordt enkel voor vakmannen op KlussenLijst gebruikt;
  // voor de homepage zelf hoeven we 'm niet te bepalen tenzij we de
  // klussenlijst willen tonen.
  let heeftWerkgebied = false;
  if (user?.rol === "vakman") {
    const v = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        regioPostcode: true,
        regioPlaats: true,
        _count: { select: { werkgebiedenExtra: true } },
      },
    });
    heeftWerkgebied =
      !!v?.regioPostcode || !!v?.regioPlaats || v?._count.werkgebiedenExtra > 0;
  }

  const isVakman = user?.rol === "vakman";
  const isConsumentOfAnoniem = !user || user.rol === "consument";
  const beroepenAantal = categorieen.length;

  return (
    <div className="min-h-screen bg-white">
      {/* === HERO === full-bleed donker met subtiele oranje glow.
          Marketing-tekst en logo staan in de SSR'd HTML — geen JS
          nodig om de hero te tonen. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white">
        <div className="pointer-events-none absolute -top-40 -right-32 w-[36rem] h-[36rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-orange-600/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

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
              {!user && (
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
            </div>
          </div>
        </header>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
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

            <div className="lg:col-span-6 xl:col-span-7">
              {isVakman ? (
                <VakmanHeroCard naam={user?.naam} />
              ) : (
                <SmartInputCard />
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* === POPULAIRE BEROEPEN === client-island met onClick handlers.
          Wordt alleen gerenderd voor anon/consument visitors. */}
      {isConsumentOfAnoniem && (
        <PopulaireBeroepen beroepenAantal={beroepenAantal} />
      )}

      {/* === STATS === 3 cards met count-up animatie. */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <StatCard
            target={vakmannen}
            label="Geverifieerde vakmannen"
            sublabel="& Handige Harries"
            iconKey="hammer"
            variant="orange-fill"
          />
          <StatCard
            target={klussen}
            label="Klussen geplaatst"
            sublabel="op het platform"
            iconKey="clipboard"
            variant="white"
          />
          <StatCard
            target={beroepenAantal}
            label="Beroepen beschikbaar"
            sublabel="van schilder tot dakdekker"
            iconKey="building"
            variant="dark"
          />
        </div>
      </section>

      {/* === HOE WERKT HET === server-rendered, geen client JS. */}
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

      {/* === WAAROM WERKMAXIMAAL === trust-bar (server-rendered) */}
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
      {TOON_TWEE_PADEN && !user && (
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

      {/* === KLUSSENLIJST === alleen voor ingelogde gebruikers.
          Anon visitors mounten dit component nooit, dus de fetch
          naar /api/klussen draait niet voor hen. */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {isVakman && (
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
              Vakman-account
            </p>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Welkom, {user.naam}
            </h2>
            <p className="text-sm text-slate-500">
              Klussen plaatsen is alleen voor consumenten. Hieronder ziet u alle
              openstaande opdrachten waar u een lead voor kunt kopen.
            </p>
          </div>
        )}

        {user && (
          <KlussenLijst user={{ ...user, heeftWerkgebied }} />
        )}
      </div>
    </div>
  );
}

// === Server-only sub-components (puur JSX, geen state) ===

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
