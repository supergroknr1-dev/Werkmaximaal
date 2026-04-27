import Link from "next/link";

export default function RegistrerenPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Account aanmaken
          </h1>
          <p className="text-sm text-slate-500">
            Kies hoe u Werkmaximaal wilt gebruiken.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/registreren/consument"
            className="bg-white border border-slate-200 hover:border-slate-900 rounded-md p-6 transition-colors group"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
              Particulier
            </p>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Ik ben consument
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Ik wil een klus plaatsen en een vakman vinden voor in en om mijn huis.
            </p>
            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
              Registreren als consument →
            </span>
          </Link>

          <Link
            href="/registreren/vakman"
            className="bg-white border border-slate-200 hover:border-slate-900 rounded-md p-6 transition-colors group"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
              Zakelijk
            </p>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Ik ben vakman
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Ik bied diensten aan en wil leads kopen van klussen in mijn werkgebied.
            </p>
            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
              Registreren als vakman →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
