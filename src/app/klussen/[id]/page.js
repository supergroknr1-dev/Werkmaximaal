import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
import { bedragVoorVakman } from "../../../lib/lead-prijs";
import VerwijderKnop from "./VerwijderKnop";
import ReactieForm from "./ReactieForm";
import LeadKopen from "./LeadKopen";

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
        select: { id: true, rol: true, vakmanType: true },
      })
    : null;

  const isVakman = sessionUser?.rol === "vakman";
  const isOwner = sessionUser && klus.userId === sessionUser.id;

  let leadGekocht = null;
  if (isVakman) {
    leadGekocht = await prisma.lead.findUnique({
      where: { klusId_vakmanId: { klusId, vakmanId: sessionUser.id } },
    });
  }

  // Vakmannen zien de volledige info pas na het kopen van de lead.
  // Consumenten (eigenaren én anderen) zien alles.
  const magVolledigeInfoZien = !isVakman || !!leadGekocht;
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
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

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
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mb-6 text-sm text-emerald-900">
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
                De volledige omschrijving en het exacte adres zijn pas zichtbaar
                nadat u deze lead heeft gekocht.
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

              <LeadKopen
                klusId={klus.id}
                bedragInCenten={bedragVoorVakman(sessionUser?.vakmanType)}
              />
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
                      <p className="text-sm font-semibold text-slate-900">{r.naam}</p>
                      <p className="text-xs text-slate-500 shrink-0">
                        {formatDatumTijd(r.aangemaakt)}
                      </p>
                    </div>
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
