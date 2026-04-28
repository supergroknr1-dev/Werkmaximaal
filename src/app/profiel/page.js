import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getSession } from "../../lib/session";
import ProfielForm from "./ProfielForm";
import WachtwoordForm from "./WachtwoordForm";

export const metadata = {
  title: "Profiel — Werkmaximaal",
};

function rolLabel(rol, vakmanType) {
  if (rol === "consument") return "Consument";
  if (rol === "vakman") {
    if (vakmanType === "professional") return "Vakman";
    if (vakmanType === "hobbyist") return "Buurtklusser";
    return "Vakman";
  }
  return rol;
}

export default async function ProfielPage() {
  const session = await getSession();
  if (!session.userId) redirect("/inloggen");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      naam: true,
      voornaam: true,
      achternaam: true,
      adres: true,
      straatnaam: true,
      huisnummer: true,
      huisnummerToevoeging: true,
      postcode: true,
      plaats: true,
      werkTelefoon: true,
      rol: true,
      vakmanType: true,
      bedrijfsnaam: true,
      kvkNummer: true,
      regioPostcode: true,
      werkafstand: true,
      aangemaakt: true,
      naamLaatstGewijzigd: true,
    },
  });
  if (!user) {
    session.destroy();
    redirect("/inloggen");
  }

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
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
            {rolLabel(user.rol, user.vakmanType)}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Mijn profiel
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Werk uw contactgegevens bij of wijzig uw wachtwoord.
          </p>
        </header>

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Account-gegevens
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Deze gegevens zijn alleen zichtbaar voor uzelf
            {user.rol === "consument"
              ? " — en voor vakmannen pas zodra zij een lead op uw klus kopen."
              : "."}
          </p>
          <ProfielForm user={user} />
        </section>

        {user.rol === "vakman" && user.kvkNummer && (
          <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              KvK-registratie
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Deze gegevens zijn vastgelegd bij uw aanmelding. Wijzigingen
              kunnen alleen door de administratie worden doorgevoerd.
            </p>
            <dl className="text-sm">
              <div className="flex py-2 border-t border-slate-100">
                <dt className="w-32 text-slate-500">KvK-nummer</dt>
                <dd className="text-slate-900 font-mono">{user.kvkNummer}</dd>
              </div>
            </dl>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Wachtwoord wijzigen
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Kies een nieuw wachtwoord van minstens 8 tekens.
          </p>
          <WachtwoordForm />
        </section>
      </div>
    </div>
  );
}
