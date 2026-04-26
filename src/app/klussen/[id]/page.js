import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import VerwijderKnop from "./VerwijderKnop";

export default async function KlusDetailPage({ params }) {
  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) notFound();

  const klus = await prisma.klus.findUnique({ where: { id: klusId } });
  if (!klus) notFound();

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

        <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Klus #{klus.id}
          </p>
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
            <div className="flex py-3 border-b border-slate-100">
              <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Plaats</dt>
              <dd className="text-sm text-slate-900">{klus.plaats}</dd>
            </div>
            {klus.postcode && (
              <div className="flex py-3 border-b border-slate-100">
                <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Postcode</dt>
                <dd className="text-sm text-slate-900 font-mono">{klus.postcode}</dd>
              </div>
            )}
            <div className="flex py-3 border-b border-slate-100">
              <dt className="w-32 text-sm font-medium text-slate-500 shrink-0">Geplaatst</dt>
              <dd className="text-sm text-slate-900">{datumLang}</dd>
            </div>
          </dl>

          <VerwijderKnop id={klus.id} />
        </div>
      </div>
    </div>
  );
}
