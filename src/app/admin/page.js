import Link from "next/link";
import {
  Users,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { prisma } from "../../lib/prisma";
import { formatBedrag } from "../../lib/lead-prijs";

function startVanDezeWeek() {
  const nu = new Date();
  const dag = nu.getDay(); // 0=zo,1=ma...
  const verschil = dag === 0 ? 6 : dag - 1;
  const ma = new Date(nu);
  ma.setDate(nu.getDate() - verschil);
  ma.setHours(0, 0, 0, 0);
  return ma;
}

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatKaart({ icon: Icon, label, waarde, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center ${accent}`}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
        {label}
      </p>
      <p className="text-3xl font-semibold text-slate-900 tracking-tight">
        {waarde}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default async function AdminOverzicht() {
  const sinds = startVanDezeWeek();

  const [
    aantalAanmeldingen,
    aantalProAanmeldingen,
    aantalHobbyAanmeldingen,
    aantalActieveKlussen,
    aantalGeslotenKlussen,
    aantalTeKeuren,
    leadsDezeWeek,
    recenteVakmannen,
    teKeurenKlussen,
  ] = await Promise.all([
    prisma.user.count({ where: { rol: "vakman" } }),
    prisma.user.count({
      where: { rol: "vakman", vakmanType: "professional" },
    }),
    prisma.user.count({ where: { rol: "vakman", vakmanType: "hobbyist" } }),
    prisma.klus.count({ where: { gesloten: false, goedgekeurd: true } }),
    prisma.klus.count({ where: { gesloten: true } }),
    prisma.klus.count({ where: { goedgekeurd: false, gesloten: false } }),
    prisma.lead.aggregate({
      where: { gekochtOp: { gte: sinds } },
      _sum: { bedrag: true },
      _count: true,
    }),
    prisma.user.findMany({
      where: { rol: "vakman" },
      orderBy: { aangemaakt: "desc" },
      take: 5,
      select: {
        id: true,
        naam: true,
        bedrijfsnaam: true,
        vakmanType: true,
        kvkNummer: true,
        aangemaakt: true,
      },
    }),
    prisma.klus.findMany({
      where: { goedgekeurd: false, gesloten: false },
      orderBy: { aangemaakt: "asc" },
      take: 5,
      include: {
        user: { select: { naam: true } },
      },
    }),
  ]);

  const omzetDezeWeek = leadsDezeWeek._sum.bedrag ?? 0;
  const aantalLeadsDezeWeek = leadsDezeWeek._count ?? 0;

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Overzicht
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Realtime statistieken over aanmeldingen, klussen en omzet.
        </p>
      </header>

      {aantalTeKeuren > 0 && (
        <Link
          href="/admin/klussen?filter=te-keuren"
          className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-6 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {aantalTeKeuren} klus{aantalTeKeuren === 1 ? "" : "sen"} wacht
                {aantalTeKeuren === 1 ? "" : "en"} op goedkeuring
              </p>
              <p className="text-xs text-amber-700">
                Open de klussen-monitor om ze te beoordelen.
              </p>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-amber-700" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatKaart
          icon={Users}
          label="Totaal aanmeldingen"
          waarde={aantalAanmeldingen}
          sub={`${aantalProAanmeldingen} Pro · ${aantalHobbyAanmeldingen} Hobbyist`}
          accent="bg-blue-50 text-blue-600"
        />
        <StatKaart
          icon={ClipboardList}
          label="Actieve klussen"
          waarde={aantalActieveKlussen}
          sub={
            aantalGeslotenKlussen
              ? `${aantalGeslotenKlussen} gesloten`
              : "Geen gesloten klussen"
          }
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatKaart
          icon={TrendingUp}
          label="Omzet deze week"
          waarde={formatBedrag(omzetDezeWeek)}
          sub={`${aantalLeadsDezeWeek} leads sinds maandag`}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recente aanmeldingen
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Laatste 5 vakman-registraties
            </p>
          </div>
          <Link
            href="/admin/vakmannen"
            className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 transition-colors"
          >
            Alle vakmannen
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {recenteVakmannen.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            Nog geen vakmannen aangemeld.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recenteVakmannen.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between px-5 py-3 gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {v.bedrijfsnaam || v.naam}
                  </p>
                  {v.bedrijfsnaam && (
                    <p className="text-xs text-slate-500 truncate">{v.naam}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {v.vakmanType === "professional" ? (
                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Pro
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Hobbyist
                    </span>
                  )}
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {formatDatum(v.aangemaakt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
