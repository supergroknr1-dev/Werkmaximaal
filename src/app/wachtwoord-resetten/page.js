"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import WachtwoordVeld from "../../components/WachtwoordVeld";

export default function WachtwoordResettenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <WachtwoordResettenContent />
    </Suspense>
  );
}

function WachtwoordResettenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [klaar, setKlaar] = useState(false);

  async function reset(e) {
    e.preventDefault();
    setFoutmelding("");

    if (wachtwoord !== bevestiging) {
      setFoutmelding("De twee wachtwoorden komen niet overeen.");
      return;
    }

    setBezig(true);

    const res = await fetch("/api/wachtwoord-resetten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, wachtwoord }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    setKlaar(true);
    setBezig(false);
    setTimeout(() => router.push("/inloggen"), 2000);
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12 md:py-16">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Geen reset-token
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Deze pagina werkt alleen via een geldige reset-link uit uw e-mail.
            </p>
            <Link
              href="/wachtwoord-vergeten"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              Vraag een nieuwe link aan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (klaar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12 md:py-16">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Wachtwoord aangepast
            </h1>
            <p className="text-sm text-slate-500">
              U wordt doorgestuurd naar de inlogpagina...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12 md:py-16">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Nieuw wachtwoord instellen
          </h1>
          <p className="text-sm text-slate-500">
            Kies een nieuw wachtwoord van minstens 8 tekens.
          </p>
        </header>

        <form
          onSubmit={reset}
          className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nieuw wachtwoord
            </label>
            <WachtwoordVeld
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Bevestig nieuw wachtwoord
            </label>
            <WachtwoordVeld
              value={bevestiging}
              onChange={(e) => setBevestiging(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
          </div>

          {foutmelding && (
            <p className="text-sm text-rose-600">{foutmelding}</p>
          )}

          <button
            type="submit"
            disabled={bezig}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
          >
            {bezig ? "Bezig..." : "Wachtwoord aanpassen"}
          </button>
        </form>
      </div>
    </div>
  );
}
