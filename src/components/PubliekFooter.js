import Link from "next/link";

/**
 * Discrete footer met juridische links. Alleen op publieke pagina's
 * — admin-area en ingelogde-auth-flows hebben hun eigen navigatie.
 */
export default function PubliekFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Werkmaximaal</p>
        <nav className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="hover:text-slate-900 transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/voorwaarden"
            className="hover:text-slate-900 transition-colors"
          >
            Voorwaarden
          </Link>
        </nav>
      </div>
    </footer>
  );
}
