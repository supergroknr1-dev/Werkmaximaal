import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getSession } from "../../lib/session";
import SluitKnop from "./SluitKnop";
import BeoordeelKnop from "./BeoordeelKnop";
import ScoreBadge from "../_components/ScoreBadge";
import { getVakmanScores } from "../../lib/reviews";

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

export default async function MijnKlussenPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/inloggen");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, naam: true, rol: true },
  });
  if (!user) {
    redirect("/inloggen");
  }
  if (user.rol !== "consument") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
          >
            ← Terug naar overzicht
          </Link>
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Alleen voor consumenten
            </h1>
            <p className="text-sm text-slate-500">
              Deze pagina toont uw eigen geplaatste klussen. Vakman-accounts
              kunnen geen klussen plaatsen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const klussen = await prisma.klus.findMany({
    where: { userId: user.id },
    orderBy: [{ gesloten: "asc" }, { aangemaakt: "desc" }],
    include: {
      reacties: { select: { id: true } },
      leads: {
        orderBy: { gekochtOp: "asc" },
        include: {
          vakman: {
            select: {
              id: true,
              naam: true,
              email: true,
              telefoon: true,
              bedrijfsnaam: true,
              vakmanType: true,
            },
          },
          review: {
            select: { id: true, score: true },
          },
        },
      },
    },
  });

  const inAfwachting = klussen.filter((k) => !k.gesloten && !k.goedgekeurd);
  const open = klussen.filter((k) => !k.gesloten && k.goedgekeurd);
  const gesloten = klussen.filter((k) => k.gesloten);

  const vakmanIds = klussen.flatMap((k) => k.leads.map((l) => l.vakman.id));
  const vakmanScores = await getVakmanScores(vakmanIds);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Mijn klussen
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overzicht van uw geplaatste klussen en de vakmannen die zich hebben
            aangemeld.
          </p>
        </header>

        {klussen.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
            U heeft nog geen klussen geplaatst.{" "}
            <Link href="/" className="text-slate-900 hover:underline">
              Plaats een klus →
            </Link>
          </div>
        )}

        {inAfwachting.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
              In afwachting van goedkeuring ({inAfwachting.length})
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Deze klussen zijn nog niet zichtbaar voor vakmannen. De
              administratie controleert ze eerst.
            </p>
            <div className="space-y-3">
              {inAfwachting.map((klus) => (
                <KlusKaart key={klus.id} klus={klus} vakmanScores={vakmanScores} />
              ))}
            </div>
          </section>
        )}

        {open.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Live ({open.length})
            </h2>
            <div className="space-y-3">
              {open.map((klus) => (
                <KlusKaart key={klus.id} klus={klus} vakmanScores={vakmanScores} />
              ))}
            </div>
          </section>
        )}

        {gesloten.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Gesloten ({gesloten.length})
            </h2>
            <div className="space-y-3">
              {gesloten.map((klus) => (
                <KlusKaart key={klus.id} klus={klus} vakmanScores={vakmanScores} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function KlusKaart({ klus, vakmanScores }) {
  return (
    <div
      className={`bg-white border rounded-md p-5 transition-colors ${
        klus.gesloten ? "border-slate-200 opacity-75" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <Link
            href={`/klussen/${klus.id}`}
            className="text-base font-medium text-slate-900 hover:underline"
          >
            {klus.titel}
          </Link>
          <p className="text-xs text-slate-500 mt-1">
            {klus.straatnaam ? (
              <>
                {klus.straatnaam} {klus.huisnummer}, {klus.plaats}
              </>
            ) : (
              klus.plaats
            )}
            <span className="mx-1.5">·</span>
            Geplaatst {formatDatum(klus.aangemaakt)}
            {klus.categorie && (
              <>
                <span className="mx-1.5">·</span>
                {klus.categorie}
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {klus.gesloten ? (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Gesloten
            </span>
          ) : klus.goedgekeurd ? (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              In afwachting
            </span>
          )}
          <SluitKnop id={klus.id} gesloten={klus.gesloten} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
          Aangemelde vakmannen ({klus.leads.length})
        </p>
        {klus.leads.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nog geen vakmannen hebben deze lead gekocht.
          </p>
        ) : (
          <ul className="space-y-2">
            {klus.leads.map((lead) => (
              <li
                key={lead.id}
                className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-medium text-slate-900">
                    {lead.vakman.bedrijfsnaam || lead.vakman.naam}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    {lead.vakman.vakmanType === "professional"
                      ? "Pro"
                      : lead.vakman.vakmanType === "hobbyist"
                      ? "Hobbyist"
                      : "Vakman"}
                  </span>
                </div>
                <div className="mb-1">
                  <ScoreBadge score={vakmanScores.get(lead.vakman.id)} />
                </div>
                {lead.vakman.bedrijfsnaam && (
                  <p className="text-xs text-slate-500">
                    Contactpersoon: {lead.vakman.naam}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  <a
                    href={`mailto:${lead.vakman.email}`}
                    className="hover:underline"
                  >
                    {lead.vakman.email}
                  </a>
                  {lead.vakman.telefoon && (
                    <>
                      {" · "}
                      <a
                        href={`tel:${lead.vakman.telefoon}`}
                        className="hover:underline"
                      >
                        {lead.vakman.telefoon}
                      </a>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lead gekocht {formatDatum(lead.gekochtOp)} · {formatBedrag(lead.bedrag)}
                </p>
                {!klus.gesloten && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <BeoordeelKnop
                      lead={{
                        id: lead.id,
                        gekochtOp: lead.gekochtOp,
                        review: lead.review,
                        vakman: {
                          naam: lead.vakman.naam,
                          bedrijfsnaam: lead.vakman.bedrijfsnaam,
                        },
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {klus.reacties.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            <Link
              href={`/klussen/${klus.id}`}
              className="hover:underline"
            >
              {klus.reacties.length} reactie
              {klus.reacties.length === 1 ? "" : "s"} bekijken →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
