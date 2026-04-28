import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, MapPin, Star } from "lucide-react";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function gemiddeldFormat(getal) {
  return getal.toFixed(1).replace(".", ",");
}

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Sterren({ score, klasse = "text-amber-500" }) {
  return (
    <span className={klasse} aria-label={`${score} van 5 sterren`}>
      {"★".repeat(score)}
      <span className="text-slate-300">{"★".repeat(5 - score)}</span>
    </span>
  );
}

function TypeBadge({ type }) {
  if (type === "professional") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        Vakman
      </span>
    );
  }
  if (type === "hobbyist") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        Buurtklusser
      </span>
    );
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) return {};
  const v = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: { naam: true, bedrijfsnaam: true, rol: true },
  });
  if (!v || v.rol !== "vakman") return {};
  return { title: `${v.bedrijfsnaam || v.naam} — Werkmaximaal` };
}

export default async function VakmanProfielPage({ params }) {
  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) notFound();

  const vakman = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: {
      id: true,
      rol: true,
      naam: true,
      bedrijfsnaam: true,
      vakmanType: true,
      regioPostcode: true,
      regioPlaats: true,
      werkafstand: true,
      profielFotoUrl: true,
      bio: true,
      aangemaakt: true,
      kvkNummer: true,
    },
  });
  if (!vakman || vakman.rol !== "vakman") notFound();

  // Reviews + lead-info ophalen via lead-relatie. We tonen ook de
  // klus-titel/categorie zodat reviews context hebben.
  const reviews = await prisma.review.findMany({
    where: { lead: { vakmanId } },
    orderBy: { aangemaakt: "desc" },
    select: {
      id: true,
      score: true,
      tekst: true,
      fotoUrls: true,
      aangemaakt: true,
      consument: { select: { voornaam: true, naam: true } },
      lead: { select: { klus: { select: { categorie: true, plaats: true } } } },
    },
  });

  const aantalReviews = reviews.length;
  const gemiddeld =
    aantalReviews > 0
      ? reviews.reduce((s, r) => s + r.score, 0) / aantalReviews
      : 0;

  // Aantal gekochte leads = ervaring-indicator
  const aantalLeads = await prisma.lead.count({ where: { vakmanId } });

  const naamWeergave = vakman.bedrijfsnaam || vakman.naam;
  const initialen = naamWeergave
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const werkgebied = vakman.regioPlaats || vakman.regioPostcode || "Onbekend";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4">
            {vakman.profielFotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vakman.profielFotoUrl}
                alt={`Foto van ${naamWeergave}`}
                className="w-20 h-20 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-semibold shrink-0">
                {initialen}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TypeBadge type={vakman.vakmanType} />
                {vakman.kvkNummer && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={11} strokeWidth={2.5} />
                    KvK geverifieerd
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">
                {naamWeergave}
              </h1>
              {vakman.bedrijfsnaam && vakman.naam && vakman.bedrijfsnaam !== vakman.naam && (
                <p className="text-sm text-slate-500 mt-0.5">{vakman.naam}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" />
                  {werkgebied}
                  {vakman.werkafstand ? ` · ${vakman.werkafstand} km` : ""}
                </span>
                <span>Lid sinds {formatDatum(vakman.aangemaakt)}</span>
              </div>
            </div>
          </div>

          {vakman.bio && (
            <p className="text-sm text-slate-700 mt-5 whitespace-pre-line leading-relaxed">
              {vakman.bio}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Beoordeling
              </p>
              {aantalReviews > 0 ? (
                <p className="text-lg font-semibold text-slate-900 mt-0.5 inline-flex items-center gap-1.5">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                  {gemiddeldFormat(gemiddeld)}
                  <span className="text-xs text-slate-500 font-normal">
                    ({aantalReviews})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-400 mt-0.5">Nog geen reviews</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Klussen aangenomen
              </p>
              <p className="text-lg font-semibold text-slate-900 mt-0.5">
                {aantalLeads}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Werkgebied
              </p>
              <p className="text-sm text-slate-900 mt-0.5 truncate">{werkgebied}</p>
            </div>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {aantalReviews === 0
                ? "Nog geen reviews — wees de eerste."
                : `${aantalReviews} ${aantalReviews === 1 ? "review" : "reviews"} van klanten`}
            </p>
          </div>

          {aantalReviews === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">
              Zodra een klant deze vakman beoordeelt, verschijnen de reviews hier.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <div>
                      <Sterren score={r.score} />
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.consument.voornaam || r.consument.naam}
                        {r.lead.klus.categorie ? ` · ${r.lead.klus.categorie}` : ""}
                        {r.lead.klus.plaats ? ` · ${r.lead.klus.plaats}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">
                      {formatDatum(r.aangemaakt)}
                    </p>
                  </div>
                  {r.tekst && (
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                      {r.tekst}
                    </p>
                  )}
                  {r.fotoUrls && r.fotoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.fotoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={`Review-foto ${i + 1}`}
                            className="w-20 h-20 object-cover rounded border border-slate-200 hover:border-slate-400 transition-colors"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
