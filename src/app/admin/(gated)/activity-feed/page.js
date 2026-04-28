import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity feed — Werkmaximaal Admin",
};

const TYPE_LABELS = {
  "klus.aangemaakt": { label: "Klus aangemaakt", icon: "📝", kleur: "slate" },
  "klus.goedgekeurd": { label: "Klus goedgekeurd", icon: "✅", kleur: "emerald" },
  "klus.verwijderd": { label: "Klus verwijderd", icon: "🗑", kleur: "rose" },
  "klus.gesloten": { label: "Klus gesloten", icon: "🔒", kleur: "slate" },
  "lead.gekocht": { label: "Lead gekocht", icon: "💼", kleur: "emerald" },
  "review.geplaatst": { label: "Review", icon: "⭐", kleur: "amber" },
  "reactie.geplaatst": { label: "Reactie", icon: "💬", kleur: "blue" },
  "gebruiker.geregistreerd": {
    label: "Nieuwe registratie",
    icon: "✨",
    kleur: "blue",
  },
  "gebruiker.ingelogd": { label: "Login", icon: "🔓", kleur: "slate" },
  "admin.ingreep": { label: "Admin-ingreep", icon: "🛡", kleur: "rose" },
};

const KLEUR_KLASSEN = {
  slate: "bg-slate-50 text-slate-700 border-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatTijdstip(datum) {
  const nu = Date.now();
  const ts = new Date(datum).getTime();
  const verschil = nu - ts;
  const minuten = Math.floor(verschil / 60_000);
  const uren = Math.floor(verschil / 3_600_000);
  if (minuten < 1) return "zojuist";
  if (minuten < 60) return `${minuten} min geleden`;
  if (uren < 24) return `${uren} uur geleden`;
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ActivityFeedPage({ searchParams }) {
  const params = await searchParams;
  const filter = params?.type || "alle";

  const where = filter === "alle" ? {} : { type: filter };

  const [events, totaal, perType] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      orderBy: { tijdstip: "desc" },
      take: 100,
    }),
    prisma.activityEvent.count(),
    prisma.activityEvent.groupBy({
      by: ["type"],
      _count: { type: true },
      orderBy: { _count: { type: "desc" } },
    }),
  ]);

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Activity feed
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {totaal.toLocaleString("nl-NL")} events vastgelegd. Toont laatste 100
          {filter !== "alle" && (
            <>
              {" "}
              voor type{" "}
              <span className="font-mono text-slate-700">{filter}</span>
            </>
          )}
          .
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Filter op type
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill href="?type=alle" label="Alle" actief={filter === "alle"} />
            {perType.map((t) => {
              const meta = TYPE_LABELS[t.type] || {
                label: t.type,
                icon: "•",
                kleur: "slate",
              };
              return (
                <FilterPill
                  key={t.type}
                  href={`?type=${t.type}`}
                  actief={filter === t.type}
                  label={`${meta.icon} ${meta.label} (${t._count.type})`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-12 text-center text-sm text-slate-500">
          Nog geen events vastgelegd voor deze filter.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100">
          {events.map((e) => {
            const meta = TYPE_LABELS[e.type] || {
              label: e.type,
              icon: "•",
              kleur: "slate",
            };
            return (
              <div key={String(e.id)} className="px-5 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-md border flex items-center justify-center text-base ${KLEUR_KLASSEN[meta.kleur]}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-slate-900 truncate">
                        {meta.label}
                      </p>
                      <p className="text-xs text-slate-500 shrink-0 font-mono">
                        {formatTijdstip(e.tijdstip)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.actorRol && (
                        <>
                          door <span className="font-medium">{e.actorRol}</span>{" "}
                          #{e.actorId}
                        </>
                      )}
                      {e.targetType && e.targetId && (
                        <>
                          <span className="mx-1.5">·</span>
                          target: {e.targetType} #{e.targetId}
                        </>
                      )}
                    </p>
                    {e.payload && Object.keys(e.payload).length > 0 && (
                      <pre className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1 mt-1.5 overflow-x-auto">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function FilterPill({ href, label, actief }) {
  const klasse = actief
    ? "bg-slate-900 text-white border-slate-900"
    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400";
  return (
    <a
      href={href}
      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${klasse}`}
    >
      {label}
    </a>
  );
}
