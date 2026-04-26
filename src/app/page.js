"use client";

import { useState, useEffect } from "react";

function tijdGeleden(datumString) {
  const verschilSeconden = Math.floor((Date.now() - new Date(datumString).getTime()) / 1000);

  if (verschilSeconden < 60) return "zojuist";

  const minuten = Math.floor(verschilSeconden / 60);
  if (minuten < 60) return minuten === 1 ? "1 minuut geleden" : `${minuten} minuten geleden`;

  const uren = Math.floor(minuten / 60);
  if (uren < 24) return uren === 1 ? "1 uur geleden" : `${uren} uur geleden`;

  const dagen = Math.floor(uren / 24);
  if (dagen < 7) return dagen === 1 ? "1 dag geleden" : `${dagen} dagen geleden`;

  return new Date(datumString).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Home() {
  const [klussen, setKlussen] = useState([]);
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [plaats, setPlaats] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gekozenPlaats, setGekozenPlaats] = useState("");

  // Haal alle klussen op zodra de pagina laadt
  useEffect(() => {
    haalKlussenOp();
  }, []);

  async function haalKlussenOp() {
    const reactie = await fetch("/api/klussen");
    const data = await reactie.json();
    setKlussen(data);
  }

  async function plaatsKlus(e) {
    e.preventDefault();
    setBezig(true);

    await fetch("/api/klussen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titel, beschrijving, plaats }),
    });

    setTitel("");
    setBeschrijving("");
    setPlaats("");
    setBezig(false);

    // Haal de bijgewerkte lijst op
    haalKlussenOp();
  }

  async function verwijderKlus(id) {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    haalKlussenOp();
  }

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const gefilterdeKlussen = gekozenPlaats
    ? klussen.filter((k) => k.plaats === gekozenPlaats)
    : klussen;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Mijn Klusplek
        </h1>
        <p className="text-gray-600 mb-8">
          Vind een vakman voor jouw klus
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Plaats een klus</h2>

          <form onSubmit={plaatsKlus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel van de klus
              </label>
              <input
                type="text"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                required
                placeholder="Bijvoorbeeld: Schilder gezocht voor woonkamer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                required
                rows="3"
                placeholder="Vertel iets meer over de klus..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plaats
              </label>
              <input
                type="text"
                value={plaats}
                onChange={(e) => setPlaats(e.target.value)}
                required
                placeholder="Bijvoorbeeld: Rotterdam"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={bezig}
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {bezig ? "Bezig met plaatsen..." : "Plaats klus"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Geplaatste klussen ({gefilterdeKlussen.length})
          </h2>

          {klussen.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter op plaats
              </label>
              <select
                value={gekozenPlaats}
                onChange={(e) => setGekozenPlaats(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              >
                <option value="">Alle plaatsen</option>
                {uniekePlaatsen.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {klussen.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-center">
              Nog geen klussen geplaatst. Wees de eerste!
            </div>
          ) : gefilterdeKlussen.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-center">
              Geen klussen gevonden in {gekozenPlaats}.
            </div>
          ) : (
            <div className="space-y-4">
              {gefilterdeKlussen.map((klus) => (
                <div key={klus.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {klus.titel}
                    </h3>
                    <button
                      onClick={() => verwijderKlus(klus.id)}
                      className="text-sm text-red-600 hover:text-red-800 hover:underline shrink-0"
                    >
                      Verwijderen
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    📍 {klus.plaats} <span className="mx-1">•</span> 🕒 {tijdGeleden(klus.aangemaakt)}
                  </p>
                  <p className="text-gray-700">{klus.beschrijving}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}