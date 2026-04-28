import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getVakmanScores } from "@/lib/reviews";
import {
  ClipboardList,
  Briefcase,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Overzicht — Werkmaximaal",
};

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function StatKaart({ label, waarde, icon: Icon, kleur = "slate" }) {
  const kleurMap = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-md border flex items-center justify-center ${kleurMap[kleur]}`}
        >
          <Icon size={16} strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {label}
          </p>
          <p className="text-lg font-semibold text-slate-900">{waarde}</p>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect("/inloggen");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      naam: true,
      voornaam: true,
      rol: true,
      vakmanType: true,
    },
  });
  if (!user) redirect("/inloggen");

  const groet = user.voornaam || user.naam || "";

  // ─── Consument-dashboard ─────────────────────────────────────────
  if (user.rol === "consument") {
    const klussen = await prisma.klus.findMany({
      where: { userId: user.id },
      orderBy: { aangemaakt: "desc" },
      take: 5,
      include: { leads: { select: { id: true } } },
    });
    const totaal = klussen.length;
    const open = klussen.filter((k) => !k.gesloten).length;
    const totaalLeads = klussen.reduce((s, k) => s + k.leads.length, 0);

    return (
      <div className="space-y-6">
        <header className="mb-2">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Mijn omgeving
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Hallo {groet}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welkom terug. Hier ziet u een snel overzicht van uw klussen.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatKaart
            label="Mijn klussen"
            waarde={totaal}
            icon={ClipboardList}
            kleur="slate"
          />
          <StatKaart
            label="Openstaand"
            waarde={open}
            icon={TrendingUp}
            kleur="emerald"
          />
          <StatKaart
            label="Aangemelde vakmannen"
            waarde={totaalLeads}
            icon={Briefcase}
            kleur="blue"
          />
        </div>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Plaats nieuwe klus
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Heeft u nog een klus die u wilt plaatsen? Vul snel het formulier
            in en wij zoeken een geschikte vakman.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            Nieuwe klus plaatsen →
          </Link>
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Recente klussen
            </h2>
            <Link
              href="/mijn-klussen"
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Alle klussen →
            </Link>
          </div>
          {klussen.length === 0 ? (
            <p className="text-sm text-slate-500">
              U heeft nog geen klussen geplaatst.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {klussen.map((k) => (
                <li key={k.id}>
                  <Link
                    href={`/klussen/${k.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {k.titel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDatum(k.aangemaakt)}
                        <span className="mx-1.5">·</span>
                        {k.leads.length} aangemeld
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ml-3 ${
                        k.gesloten
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : k.goedgekeurd
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {k.gesloten
                        ? "Gesloten"
                        : k.goedgekeurd
                        ? "Live"
                        : "In afwachting"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ─── Vakman / Buurtklusser-dashboard ─────────────────────────────
  if (user.rol === "vakman") {
    const [leads, openstaandeKlussenAantal] = await Promise.all([
      prisma.lead.findMany({
        where: { vakmanId: user.id },
        orderBy: { gekochtOp: "desc" },
        take: 5,
        include: {
          klus: { select: { id: true, titel: true, plaats: true } },
        },
      }),
      prisma.klus.count({
        where: { gesloten: false, goedgekeurd: true },
      }),
    ]);
    const scoreMap = await getVakmanScores([user.id]);
    const score = scoreMap.get(user.id);

    return (
      <div className="space-y-6">
        <header className="mb-2">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Mijn omgeving
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Hallo {groet}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welkom terug. Hier ziet u uw leads, score en openstaande klussen.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatKaart
            label="Gekochte leads"
            waarde={leads.length}
            icon={Briefcase}
            kleur="slate"
          />
          <StatKaart
            label="Openstaande klussen"
            waarde={openstaandeKlussenAantal}
            icon={Search}
            kleur="emerald"
          />
          <StatKaart
            label="Gemiddelde score"
            waarde={
              score
                ? `${(Math.round(score.gemiddelde * 10) / 10)
                    .toFixed(1)
                    .replace(".", ",")} (${score.aantal})`
                : "—"
            }
            icon={Star}
            kleur="amber"
          />
        </div>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Klussen vinden
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Bekijk alle openstaande klussen op de homepage en koop een lead
            om in contact te komen met de klant.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            Naar klussen-overzicht →
          </Link>
        </section>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Recente leads
            </h2>
            <Link
              href="/mijn-leads"
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Alle leads →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500">
              U heeft nog geen leads gekocht.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.map((l) => (
                <li key={l.id} className="py-2.5">
                  <Link
                    href={`/klussen/${l.klus.id}`}
                    className="flex items-center justify-between hover:bg-slate-50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {l.klus.titel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {l.klus.plaats}
                        <span className="mx-1.5">·</span>
                        Gekocht {formatDatum(l.gekochtOp)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">
        Welkom op Werkmaximaal
      </h1>
    </div>
  );
}
