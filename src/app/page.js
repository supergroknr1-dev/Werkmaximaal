"use client";

import { useState } from "react";

export default function Home() {
  // Hier "onthouden" we de klussen
  const [klussen, setKlussen] = useState([]);

  // Hier "onthouden" we wat er nu in het formulier staat
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [plaats, setPlaats] = useState("");

  // Wat er gebeurt als je op "Plaats klus" klikt
  function plaatsKlus(e) {
    e.preventDefault(); // niet de pagina opnieuw laden

    // Maak een nieuwe klus
    const nieuweKlus = {
      id: Date.now(),
      titel: titel,
      beschrijving: beschrijving,
      plaats: plaats,
    };

    // Voeg hem toe aan de lijst
    setKlussen([nieuweKlus, ...klussen]);

    // Maak het formulier weer leeg
    setTitel("");
    setBeschrijving("");
    setPlaats("");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Mijn Klusplek
        </h1>
        <p className="text-gray-600 mb-8">
          Vind een vakman voor jouw klus
        </p>

        {/* Het formulier */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Plaats een klus
          </h2>

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
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Plaats klus
            </button>
          </form>
        </div>

        {/* De lijst met klussen */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Geplaatste klussen ({klussen.length})
          </h2>

          {klussen.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-center">
              Nog geen klussen geplaatst. Wees de eerste!
            </div>
          ) : (
            <div className="space-y-4">
              {klussen.map((klus) => (
                <div key={klus.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {klus.titel}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    📍 {klus.plaats}
                  </p>
                  <p className="text-gray-700">
                    {klus.beschrijving}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}