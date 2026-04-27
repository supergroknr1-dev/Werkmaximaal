import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import Sidebar from "./Sidebar";

export const metadata = {
  title: "Admin Center — Werkmaximaal",
};

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar adminNaam={user.naam} />
      <div className="md:pl-60">
        <main className="px-6 md:px-10 py-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
