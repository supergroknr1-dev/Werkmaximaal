import { prisma } from "@/lib/prisma";
import VerifyChainKnop from "./VerifyChainKnop";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit log — Werkmaximaal Admin",
};

const CATEGORIE_KLEUR = {
  compliance: "bg-rose-50 text-rose-700 border-rose-200",
  pricing: "bg-amber-50 text-amber-700 border-amber-200",
  ranking: "bg-emerald-50 text-emerald-700 border-emerald-200",
  support: "bg-blue-50 text-blue-700 border-blue-200",
  data: "bg-slate-50 text-slate-700 border-slate-200",
  settings: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatTijdstip(d) {
  return new Date(d).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bytesNaarHex(buf, lengte = 8) {
  if (!buf) return null;
  return Buffer.from(buf).toString("hex").slice(0, lengte);
}

export default async function AuditLogPage({ searchParams }) {
  const params = await searchParams;
  const categorie = params?.categorie || "alle";

  const where = categorie === "alle" ? {} : { actieCategorie: categorie };

  const [entries, totaal, perCategorie] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { id: "desc" },
      take: 100,
    }),
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ["actieCategorie"],
      _count: { actieCategorie: true },
    }),
  ]);

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Admin Center · Governance
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Audit log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Onveranderbaar logboek van admin-acties.{" "}
            {totaal.toLocaleString("nl-NL")} entries vastgelegd. Hash-chain
            beschermt tegen manipulatie.
          </p>
        </div>
        <VerifyChainKnop />
      </header>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Filter op categorie
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              href="?categorie=alle"
              label="Alle"
              actief={categorie === "alle"}
            />
            {perCategorie.map((c) => (
              <FilterPill
                key={c.actieCategorie}
                href={`?categorie=${c.actieCategorie}`}
                label={`${c.actieCategorie} (${c._count.actieCategorie})`}
                actief={categorie === c.actieCategorie}
              />
            ))}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Nog geen entries
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Zodra admins acties uitvoeren via de intervention-API
            (vakmannen bewerken, klussen modereren, etc.) verschijnen die
            hier — onveranderbaar en hash-getekend.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100">
          {entries.map((e) => (
            <div key={String(e.id)} className="px-5 py-4 text-sm">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${CATEGORIE_KLEUR[e.actieCategorie] || ""}`}
                  >
                    {e.actieCategorie}
                  </span>
                  <span className="font-mono text-xs text-slate-700 truncate">
                    {e.actie}
                  </span>
                </div>
                <p className="text-xs text-slate-500 shrink-0 font-mono">
                  {formatTijdstip(e.tijdstip)}
                </p>
              </div>
              <p className="text-sm text-slate-900 mb-1.5">
                door <span className="font-medium">{e.adminNaam}</span>
                {e.targetType && e.targetId !== null && (
                  <>
                    {" "}
                    op{" "}
                    <span className="font-mono text-slate-700">
                      {e.targetType} #{e.targetId}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-600 italic mb-2 leading-relaxed">
                "{e.reden}"
              </p>
              {e.payload && Object.keys(e.payload).length > 0 && (
                <pre className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1.5 overflow-x-auto mb-2">
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              )}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                {e.goedgekeurdDoor && (
                  <span className="text-emerald-600">
                    ✓ 4-ogen door admin #{e.goedgekeurdDoor}
                  </span>
                )}
                <span>id: {String(e.id)}</span>
                <span title={Buffer.from(e.rijHash).toString("hex")}>
                  hash: {bytesNaarHex(e.rijHash, 16)}…
                </span>
                {e.vorigHash && (
                  <span title={Buffer.from(e.vorigHash).toString("hex")}>
                    vorig: {bytesNaarHex(e.vorigHash, 12)}…
                  </span>
                )}
              </div>
            </div>
          ))}
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
