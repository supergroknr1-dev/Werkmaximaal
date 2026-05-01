"use client";

import { useState } from "react";
import Link from "next/link";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [verzonden, setVerzonden] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState("");

  async function vraagAan(e) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding("");

    const res = await fetch("/api/wachtwoord-vergeten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    if (data.demoResetUrl) setDemoResetUrl(data.demoResetUrl);
    setVerzonden(true);
    setBezig(false);
  }

  if (verzonden) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12 md:py-16">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Reset-link verzonden
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Als er een account bestaat met dit e-mailadres, ontvangt u een
              link om uw wachtwoord opnieuw in te stellen. Controleer ook uw
              spam-map.
            </p>

            {demoResetUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-2">
                  Demo-modus
                </p>
                <p className="text-sm text-amber-900 mb-3">
                  De e-mailservice is nog niet ingericht. Voor nu kunt u deze
                  reset-link direct gebruiken:
                </p>
                <a
                  href={demoResetUrl}
                  className="text-sm text-slate-900 underline break-all"
                >
                  {demoResetUrl}
                </a>
              </div>
            )}

            <Link
              href="/inloggen"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              Naar inloggen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12 md:py-16">
        <Link
          href="/inloggen"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar inloggen
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Wachtwoord vergeten
          </h1>
          <p className="text-sm text-slate-500">
            Vul uw e-mailadres in. Wij sturen u een link om uw wachtwoord
            opnieuw in te stellen.
          </p>
        </header>

        <form
          onSubmit={vraagAan}
          className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
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
            {bezig ? "Bezig..." : "Verstuur reset-link"}
          </button>
        </form>
      </div>
    </div>
  );
}
