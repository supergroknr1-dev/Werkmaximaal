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

const CATEGORIEEN = [
  "Schilder",
  "Loodgieter",
  "Klusjesman",
  "Tuinman",
  "Elektricien",
  "Timmerman",
  "Stratenmaker",
  "Anders",
];

const TREFWOORDEN = {
  Tuinman: ["boom", "heg", "tuin", "gras", "snoeien", "plant", "haag"],
  Schilder: ["verf", "muur", "schilderen", "kwast", "behang", "plafond"],
  Loodgieter: ["leiding", "kraan", "lekkage", "wc", "douche", "buis", "verstopping"],
  Elektricien: ["stopcontact", "kabel", "stroom", "lamp", "elektra", "schakelaar"],
  Timmerman: ["hout", "deur", "kast", "vloer", "raam"],
  Stratenmaker: ["tegel", "stoep", "oprit", "bestrating"],
  Klusjesman: ["ophangen", "monteren", "schroef"],
};

const EMOJI_PER_CATEGORIE = {
  Tuinman: "🌳",
  Schilder: "🎨",
  Loodgieter: "🔧",
  Elektricien: "⚡",
  Timmerman: "🪵",
  Stratenmaker: "🧱",
  Klusjesman: "🛠️",
};

function detectCategorie(tekst) {
  if (!tekst) return null;
  const lager = tekst.toLowerCase();
  for (const [categorie, woorden] of Object.entries(TREFWOORDEN)) {
    if (woorden.some((w) => lager.includes(w))) {
      return categorie;
    }
  }
  return null;
}

export default function Home() {
  const [klussen, setKlussen] = useState([]);
  const [titel, setTitel] = useState("");
  const [plaats, setPlaats] = useState("");
  const [categorie, setCategorie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gekozenPlaats, setGekozenPlaats] = useState("");
  const [categorieAangeraakt, setCategorieAangeraakt] = useState(false);
  const [stap, setStap] = useState(1);

  useEffect(() => {
    haalKlussenOp();
  }, []);

  useEffect(() => {
    if (categorieAangeraakt) return;
    const gevonden = detectCategorie(titel);
    if (gevonden) setCategorie(gevonden);
  }, [titel, categorieAangeraakt]);

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
      body: JSON.stringify({ titel, plaats, categorie }),
    });

    setTitel("");
    setPlaats("");
    setCategorie("");
    setCategorieAangeraakt(false);
    setStap(1);
    setBezig(false);

    haalKlussenOp();
  }

  async function verwijderKlus(id) {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    haalKlussenOp();
  }

  const huidigeCategorie = detectCategorie(titel);
  const emoji = !titel.trim()
    ? "💭"
    : huidigeCategorie
    ? EMOJI_PER_CATEGORIE[huidigeCategorie]
    : "✨";

  const uniekePlaatsen = [...new Set(klussen.map((k) => k.plaats))].sort();
  const gefilterdeKlussen = gekozenPlaats
    ? klussen.filter((k) => k.plaats === gekozenPlaats)
    : klussen;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto pt-4 md:pt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          Mijn Klusplek
        </h1>
        <p className="text-gray-600 mb-8">
          Vind een vakman voor jouw klus — onder het genot van een kop koffie ☕
        </p>

        <div className="flex items-center gap-3 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold transition-all ${
                stap >= 1 ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </span>
            <span className={stap === 1 ? "font-semibold text-gray-900" : "text-gray-500"}>
              Jouw klus
            </span>
          </div>
          <span className="text-gray-300">———</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold transition-all ${
                stap >= 2 ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </span>
            <span className={stap === 2 ? "font-semibold text-gray-900" : "text-gray-500"}>
              Bijna klaar
            </span>
          </div>
        </div>

        <form onSubmit={plaatsKlus}>
          {stap === 1 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-rose-100/50 p-6 md:p-10 border border-rose-100/60 mb-8">
              <div
                key={emoji}
                className="text-7xl mb-4 text-center transition-transform duration-300"
                style={{ animation: "pop 0.4s ease-out" }}
              >
                {emoji}
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                {titel.trim() ? "Klinkt als een mooi project!" : "Wat een leuk project!"}
              </h2>
              <p className="text-gray-600 mb-8 text-center">
                {titel.trim()
                  ? "Bijna klaar — klik door wanneer je tevreden bent."
                  : "Vertel eens, waar droom je van?"}
              </p>

              <textarea
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                required
                rows={4}
                placeholder="Bijvoorbeeld: Ik zoek iemand die de oude eik in mijn achtertuin kan omhakken zodat we eindelijk weer zon hebben..."
                className="w-full px-5 py-4 bg-amber-50/40 border-2 border-amber-200/50 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-300 focus:bg-white focus:shadow-lg transition-all resize-none"
              />

              {huidigeCategorie && (
                <p className="text-sm text-rose-600 mt-3 text-center">
                  Lijkt me een klus voor een{" "}
                  <span className="font-semibold">{huidigeCategorie.toLowerCase()}</span>{" "}
                  {EMOJI_PER_CATEGORIE[huidigeCategorie]}
                </p>
              )}

              <button
                type="button"
                onClick={() => setStap(2)}
                disabled={!titel.trim()}
                className="w-full mt-8 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              >
                Volgende →
              </button>
            </div>
          )}

          {stap === 2 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-rose-100/50 p-6 md:p-10 border border-rose-100/60 mb-8">
              <div className="bg-amber-50/60 rounded-2xl p-4 mb-6 border-l-4 border-rose-300">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Jouw klus</p>
                <p className="text-gray-800 italic">&ldquo;{titel}&rdquo;</p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bijna klaar! 🎉</h2>
              <p className="text-gray-600 mb-6">Nog twee dingetjes en je staat live.</p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waar is de klus?
                </label>
                <input
                  type="text"
                  value={plaats}
                  onChange={(e) => setPlaats(e.target.value)}
                  required
                  placeholder="Bijvoorbeeld: Rotterdam"
                  className="w-full px-4 py-3 bg-amber-50/40 border-2 border-amber-200/50 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-300 focus:bg-white focus:shadow-lg transition-all"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorie{" "}
                  <span className="text-gray-400 text-xs font-normal">
                    {huidigeCategorie ? "(automatisch herkend, mag je aanpassen)" : "(vul zelf in)"}
                  </span>
                </label>
                <input
                  type="text"
                  value={categorie}
                  onChange={(e) => {
                    setCategorie(e.target.value);
                    setCategorieAangeraakt(true);
                  }}
                  list="categorieen-lijst"
                  placeholder="Begin te typen voor suggesties..."
                  className="w-full px-4 py-3 bg-amber-50/40 border-2 border-amber-200/50 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-300 focus:bg-white focus:shadow-lg transition-all"
                />
                <datalist id="categorieen-lijst">
                  {CATEGORIEEN.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStap(1)}
                  className="px-5 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  ← Terug
                </button>
                <button
                  type="submit"
                  disabled={bezig}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-3 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {bezig ? "Bezig..." : "Plaats klus 🚀"}
                </button>
              </div>
            </div>
          )}
        </form>

        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
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
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-amber-200/50 rounded-2xl text-gray-900 focus:outline-none focus:border-rose-300 transition-all"
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-8 text-gray-500 text-center border border-rose-100/60">
              Nog geen klussen geplaatst. Wees de eerste!
            </div>
          ) : gefilterdeKlussen.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-8 text-gray-500 text-center border border-rose-100/60">
              Geen klussen gevonden in {gekozenPlaats}.
            </div>
          ) : (
            <div className="space-y-4">
              {gefilterdeKlussen.map((klus) => (
                <div
                  key={klus.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-rose-100/60 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">{klus.titel}</h3>
                    <button
                      onClick={() => verwijderKlus(klus.id)}
                      className="text-sm text-red-600 hover:text-red-800 hover:underline shrink-0"
                    >
                      Verwijderen
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    📍 {klus.plaats} <span className="mx-1">•</span> 🕒{" "}
                    {tijdGeleden(klus.aangemaakt)}
                    {klus.categorie && (
                      <>
                        {" "}
                        <span className="mx-1">•</span> {EMOJI_PER_CATEGORIE[klus.categorie] || "🏷️"}{" "}
                        {klus.categorie}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pop {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
