"use client";

import { useState } from "react";
import Link from "next/link";
import WachtwoordVeld from "../../../components/WachtwoordVeld";
import SpamVelden, { useSpamVelden } from "../../../components/SpamVelden";

export default function RegistrerenConsumentPage() {
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [succes, setSucces] = useState(false);
  const spam = useSpamVelden();

  async function registreer(e) {
    e.preventDefault();
    setBezig(true);
    setFoutmelding("");

    const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim();

    const res = await fetch("/api/registreren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rol: "consument",
        naam,
        voornaam,
        achternaam,
        email,
        wachtwoord,
        ...spam.body(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }

    setSucces(true);
    setBezig(false);
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12 md:py-16">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Account aangemaakt
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              U kunt nu inloggen met uw e-mail en wachtwoord.
            </p>
            <Link
              href="/inloggen"
              className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
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
          href="/registreren"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug
        </Link>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">
            Particulier
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Registreren als consument
          </h1>
          <p className="text-sm text-slate-500">
            Vul uw gegevens in om een account aan te maken.
          </p>
        </header>

        <form
          onSubmit={registreer}
          className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Voornaam
              </label>
              <input
                type="text"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                required
                autoComplete="given-name"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Achternaam
              </label>
              <input
                type="text"
                value={achternaam}
                onChange={(e) => setAchternaam(e.target.value)}
                required
                autoComplete="family-name"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
              />
            </div>
          </div>

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
            <WachtwoordVeld
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Minstens 8 tekens.</p>
          </div>

          <SpamVelden state={spam} />

          {foutmelding && (
            <p className="text-sm text-rose-600">{foutmelding}</p>
          )}

          <button
            type="submit"
            disabled={bezig}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
          >
            {bezig ? "Bezig met registreren..." : "Account aanmaken"}
          </button>
        </form>
      </div>
    </div>
  );
}
