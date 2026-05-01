import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { bedragVoorVakman } from "../../../lib/lead-prijs";
import VerwijderKnop from "./VerwijderKnop";
import ReactieForm from "./ReactieForm";
import LeadKopen from "./LeadKopen";
import ScoreBadge from "../../_components/ScoreBadge";
import { getVakmanScores } from "../../../lib/reviews";

function formatDatumTijd(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function KlusDetailPage({ params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) notFound();

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    include: {
      reacties: { orderBy: { aangemaakt: "asc" } },
    },
  });
  if (!klus) notFound();

  const session = await getSession();
  const sessionUser = session.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, rol: true, vakmanType: true, isAdmin: true },
      })
    : null;

  const isVakman = sessionUser?.rol === "vakman";
  const isOwner = sessionUser && klus.userId === sessionUser.id;
  const isAdmin = !!sessionUser?.isAdmin;

  // Niet-goedgekeurde klussen zijn alleen zichtbaar voor de eigenaar of
  // een admin. Voor anderen (anoniem of vakmannen) doen we alsof de klus
  // niet bestaat — er moet niets uit de inhoud lekken.
  if (!klus.goedgekeurd && !isOwner && !isAdmin) {
    notFound();
  }

  let leadGekocht = null;
  if (isVakman) {
    leadGekocht = await prisma.lead.findUnique({
      where: { klusId_vakmanId: { klusId, vakmanId: sessionUser.id } },
    });
  }

  const reactieUserIds = klus.reacties
    .map((r) => r.userId)
    .filter((id) => id !== null);
  const vakmanScores = await getVakmanScores(reactieUserIds);

  // Adressen zijn privé. Alleen de eigenaar, een admin of een vakman
  // die de lead heeft gekocht ziet de volledige info. Andere consumenten
  // en anonieme bezoekers krijgen de paywall-view.
  const magVolledigeInfoZien = isOwner || isAdmin || (isVakman && !!leadGekocht);
  const magVerwijderen =
    sessionUser && (klus.userId === null || klus.userId === sessionUser.id);

  const datumLang = new Date(klus.aangemaakt).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        {isAdmin ? (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-slate-500 mb-6"
          >
            <Link href="/admin" className="hover:text-slate-900 transition-colors">
              Admin
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/admin/klussen"
              className="hover:text-slate-900 transition-colors"
            >
              Klussen Monitor
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Klus #{klus.id}</span>
          </nav>
        ) : (
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
          >
            ← Terug naar overzicht
          </Link>
        )}

        {!klus.goedgekeurd && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 text-sm text-amber-900">
            <p className="font-semibold mb-1">In afwachting van goedkeuring</p>
            <p className="text-xs">
              Deze klus wordt eerst gecontroleerd door de administratie. Hij is
              nog niet zichtbaar voor vakmannen. U krijgt hierover bericht zodra
              de klus is goedgekeurd.
            </p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-6">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Klus #{klus.id}
          </p>

          {magVolledigeInfoZien ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-8 leading-snug">
                {klus.titel}
              </h1>

              <dl className="space-y-0 mb-10 border-t border-slate-100">
                {klus.categorie && (
                  <div className="flex py-3 border-b border-slate-100">
                    <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Categorie</dt>
                    <dd className="text-sm text-slate-900">{klus.categorie}</dd>
                  </div>
                )}
                {klus.straatnaam ? (
                  <div className="flex py-3 border-b border-slate-100">
                    <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Adres</dt>
                    <dd className="text-sm text-slate-900">
                      {klus.straatnaam} {klus.huisnummer}, {klus.postcode} {klus.plaats}
                    </dd>
                  </div>
                ) : (
                  <>
                    <div className="flex py-3 border-b border-slate-100">
                      <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Plaats</dt>
                      <dd className="text-sm text-slate-900">{klus.plaats}</dd>
                    </div>
                    {klus.postcode && (
                      <div className="flex py-3 border-b border-slate-100">
                        <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Postcode</dt>
                        <dd className="text-sm text-slate-900 font-mono">
                          {klus.postcode}{klus.huisnummer ? ` ${klus.huisnummer}` : ""}
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex py-3 border-b border-slate-100">
                  <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Geplaatst</dt>
                  <dd className="text-sm text-slate-900">{datumLang}</dd>
                </div>
              </dl>

              {isVakman && leadGekocht && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-6 text-sm text-orange-900">
                  ✓ Lead gekocht op {formatDatumTijd(leadGekocht.gekochtOp)}
                </div>
              )}

              {magVerwijderen && <VerwijderKnop id={klus.id} />}
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-slate-900 mb-2">
                Opdracht in {klus.plaats}
              </h1>
              <p className="text-sm text-slate-500 mb-8">
                {isVakman
                  ? "De volledige omschrijving en het exacte adres zijn pas zichtbaar nadat u deze lead heeft gekocht."
                  : "Het exacte adres en de volledige omschrijving worden pas vrijgegeven aan een vakman zodra hij of zij de lead koopt."}
              </p>

              <dl className="space-y-0 mb-10 border-t border-slate-100">
                {klus.categorie && (
                  <div className="flex py-3 border-b border-slate-100">
                    <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Type dienst</dt>
                    <dd className="text-sm text-slate-900">{klus.categorie}</dd>
                  </div>
                )}
                <div className="flex py-3 border-b border-slate-100">
                  <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Plaats</dt>
                  <dd className="text-sm text-slate-900">{klus.plaats}</dd>
                </div>
                <div className="flex py-3 border-b border-slate-100">
                  <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Geplaatst</dt>
                  <dd className="text-sm text-slate-900">{datumLang}</dd>
                </div>
              </dl>

              {isVakman ? (
                <LeadKopen
                  klusId={klus.id}
                  bedragInCenten={await bedragVoorVakman(sessionUser?.vakmanType)}
                />
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-600">
                  Het exacte adres en de volledige omschrijving zijn alleen
                  zichtbaar voor de eigenaar van deze klus en voor vakmannen
                  die een lead hebben gekocht.
                </div>
              )}
            </>
          )}
        </div>

        {magVolledigeInfoZien && (
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Reacties{" "}
              <span className="text-slate-400 font-normal">({klus.reacties.length})</span>
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Bent u vakman? Plaats hieronder uw reactie op deze klus.
            </p>

            {klus.reacties.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-4 mb-8">
                Nog geen reacties. Wees de eerste die reageert.
              </p>
            ) : (
              <ul className="space-y-3 mb-8">
                {klus.reacties.map((r) => (
                  <li
                    key={r.id}
                    className="bg-slate-50 border border-slate-200 rounded-md p-4"
                  >
                    <div className="flex justify-between items-baseline mb-1 gap-3">
                      {r.userId ? (
                        <Link
                          href={`/vakmannen/${r.userId}`}
                          className="text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline"
                        >
                          {r.naam}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">{r.naam}</p>
                      )}
                      <p className="text-xs text-slate-500 shrink-0">
                        {formatDatumTijd(r.aangemaakt)}
                      </p>
                    </div>
                    {r.userId && (
                      <div className="mb-1.5">
                        <ScoreBadge score={vakmanScores.get(r.userId)} />
                      </div>
                    )}
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {r.bericht}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Reageer op deze klus
              </h3>
              <ReactieForm klusId={klus.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
