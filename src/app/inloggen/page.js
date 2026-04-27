"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InloggenPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");

  async function inloggen(e) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, wachtwoord }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Inloggen
          </h1>
          <p className="text-sm text-slate-500">
            Voer uw e-mailadres en wachtwoord in.
          </p>
        </header>

        <form
          onSubmit={inloggen}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
          </div>

          {foutmelding && (
            <p className="text-sm text-rose-600">{foutmelding}</p>
          )}

          <button
            type="submit"
            disabled={bezig}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
          >
            {bezig ? "Bezig met inloggen..." : "Inloggen"}
          </button>

          <p className="text-sm text-slate-500 text-center pt-2 border-t border-slate-100">
            Nog geen account?{" "}
            <Link href="/registreren" className="text-slate-900 hover:underline font-medium">
              Registreren
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
