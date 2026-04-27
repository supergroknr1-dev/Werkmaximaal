import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getCurrentUser } from "../../lib/auth";
import { getInstellingen } from "../../lib/instellingen";
import InstellingToggle from "./InstellingToggle";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Geen toegang
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Deze pagina is alleen toegankelijk voor beheerders.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }

  const [
    aantalConsumenten,
    aantalProfessionals,
    aantalHobbyisten,
    aantalKlussen,
    aantalLeads,
    instellingen,
  ] = await Promise.all([
    prisma.user.count({ where: { rol: "consument" } }),
    prisma.user.count({ where: { rol: "vakman", vakmanType: "professional" } }),
    prisma.user.count({ where: { rol: "vakman", vakmanType: "hobbyist" } }),
    prisma.klus.count(),
    prisma.lead.count(),
    getInstellingen(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
            Beheer
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Statistieken en platformbrede instellingen.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
              Consumenten
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {aantalConsumenten}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
              Professionals
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {aantalProfessionals}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
              Hobbyisten
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {aantalHobbyisten}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
              Klussen
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {aantalKlussen}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
              Leads
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {aantalLeads}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Platforminstellingen
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Wijzigingen werken direct door op het hele platform.
          </p>
          <div className="divide-y divide-slate-100">
            <InstellingToggle
              instelling="hobbyistInschakeld"
              beginWaarde={instellingen.hobbyistInschakeld}
              label="Handige Harry (hobbyist) inschakelen"
              omschrijving="Wanneer uitgeschakeld kunnen er geen nieuwe hobbyist-accounts meer worden aangemaakt en kunnen consumenten geen klussen meer plaatsen die exclusief voor hobbyisten zijn. Bestaande accounts en klussen blijven werken."
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            Snelkoppelingen
          </h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/beheer"
                className="text-sm text-slate-700 hover:text-slate-900 hover:underline"
              >
                Trefwoorden beheren →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
