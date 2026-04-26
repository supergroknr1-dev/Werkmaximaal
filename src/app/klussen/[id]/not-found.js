import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-slate-500 mb-2 font-medium">404</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Klus niet gevonden
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Deze klus bestaat niet of is inmiddels verwijderd.
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
