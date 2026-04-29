"use client";

import { LogOut } from "lucide-react";

/**
 * Sticky top-balk met begroeting + uitlog-knop. Wordt gebruikt op zowel:
 *   - /admin/(gated) (admin omgeving)
 *   - /(ingelogd) (consument + vakman omgeving)
 *
 * Match-styling met de donkere sidebar voor één samenhangend uiterlijk.
 * Mobiel: alleen het uitlog-icoon zichtbaar; naam wordt verborgen om
 * ruimte te besparen.
 */
export default function IngelogdTopBar({ naam, voornaam, redirectNa = "/" }) {
  async function uitloggen() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = redirectNa;
  }

  // "Hoi, X" — voornaam als die er is, anders eerste woord van volledige naam
  const begroetingNaam = voornaam || naam?.split(" ")[0] || "";

  return (
    <div className="sticky top-0 z-30 bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="px-4 md:px-6 py-2.5 flex items-center justify-end gap-3">
        {begroetingNaam && (
          <span className="hidden sm:inline text-sm text-slate-300">
            Hoi, <span className="text-white font-medium">{begroetingNaam}</span>
          </span>
        )}
        <button
          type="button"
          onClick={uitloggen}
          title="Uitloggen"
          aria-label="Uitloggen"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
