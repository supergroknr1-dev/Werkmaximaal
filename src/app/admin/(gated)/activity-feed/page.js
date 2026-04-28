import { prisma } from "@/lib/prisma";
import ActivityFeedLive from "./ActivityFeedLive";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity feed — Werkmaximaal Admin",
};

const TYPE_META = {
  "klus.aangemaakt": { label: "Klus aangemaakt", icon: "📝" },
  "klus.goedgekeurd": { label: "Klus goedgekeurd", icon: "✅" },
  "klus.afgekeurd": { label: "Klus afgekeurd", icon: "🚫" },
  "klus.verwijderd": { label: "Klus verwijderd", icon: "🗑" },
  "klus.gesloten": { label: "Klus gesloten", icon: "🔒" },
  "lead.gekocht": { label: "Lead gekocht", icon: "💼" },
  "review.geplaatst": { label: "Review", icon: "⭐" },
  "reactie.geplaatst": { label: "Reactie", icon: "💬" },
  "gebruiker.geregistreerd": { label: "Nieuwe registratie", icon: "✨" },
  "gebruiker.ingelogd": { label: "Login", icon: "🔓" },
  "admin.ingreep": { label: "Admin-ingreep", icon: "🛡" },
};

function serializeEvent(e) {
  return {
    id: String(e.id),
    type: e.type,
    tijdstip: e.tijdstip.toISOString(),
    actorId: e.actorId,
    actorRol: e.actorRol,
    targetType: e.targetType,
    targetId: e.targetId,
    payload: e.payload,
  };
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

  // BigInt → string voor JSON-serialisatie naar de client
  const initialEvents = events.map(serializeEvent);

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
          {totaal.toLocaleString("nl-NL")} events vastgelegd. Live-stream toont
          nieuwe events automatisch.
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
              const meta = TYPE_META[t.type] || { label: t.type, icon: "•" };
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

      <ActivityFeedLive initialEvents={initialEvents} filter={filter} />
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
