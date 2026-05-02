"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, ArrowRight } from "lucide-react";

const HANDOFF_KEY = "werkmaximaal_aanvraag_handoff";

// Client-island binnen de server-rendered hero. Doet de LLM-ontleding
// (gpt-4o-mini via /api/ontleed-klus) en navigeert naar /aanvraag met
// handoff via sessionStorage.
export default function SmartInputCard() {
  const router = useRouter();
  const [zoekTekst, setZoekTekst] = useState("");
  const [zoekt, setZoekt] = useState(false);

  async function startSmartZoek() {
    if (!zoekTekst.trim()) return;
    setZoekt(true);
    let categorieResult = "";
    let klusLijstResult = [];
    try {
      const res = await fetch("/api/ontleed-klus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: zoekTekst }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.klussen) && data.klussen.length > 0) {
          klusLijstResult = data.klussen;
          categorieResult = data.klussen[0].beroep;
        }
      }
    } catch {
      // netwerkfout — gebruiker kiest categorie op /aanvraag
    }

    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({
          titel: zoekTekst.trim(),
          categorie: categorieResult,
          klusLijst: klusLijstResult,
        })
      );
    } catch {}

    setZoekt(false);
    router.push("/aanvraag");
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-950/40 ring-1 ring-white/20 overflow-hidden">
      <div className="px-5 md:px-6 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center gap-2 border-b border-slate-700">
        <div className="w-7 h-7 rounded-md bg-orange-500/20 flex items-center justify-center">
          <Search size={14} className="text-orange-300" />
        </div>
        <h3 className="text-sm font-semibold">Wat is uw klus?</h3>
        <span className="ml-auto text-[10px] text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">
          Stap 1 van 2
        </span>
      </div>
      <div className="p-5 md:p-6">
        <textarea
          value={zoekTekst}
          onChange={(e) => setZoekTekst(e.target.value)}
          placeholder="bijv: mijn wc spoelt niet door, of voordeur kapot en lekkage in keuken"
          rows={4}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 resize-none transition-all"
        />

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Sparkles size={12} className="text-orange-500" />
          <span>
            Onze AI splitst meerdere klussen automatisch in losse aanvragen.
          </span>
        </div>

        <button
          type="button"
          onClick={startSmartZoek}
          disabled={zoekt || !zoekTekst.trim()}
          className="mt-5 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm md:text-base font-semibold py-3.5 rounded-lg transition-colors relative overflow-hidden inline-flex items-center justify-center gap-2"
        >
          <span
            className="absolute inset-y-0 left-0 bg-orange-300/60 transition-[width] ease-out"
            style={{
              width: zoekt ? "95%" : "0%",
              transitionDuration: zoekt ? "3000ms" : "200ms",
            }}
          />
          <span className="relative inline-flex items-center gap-2">
            {zoekt ? (
              "Bezig met analyseren..."
            ) : (
              <>
                Vind mijn vakman <ArrowRight size={16} />
              </>
            )}
          </span>
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          Gratis &amp; vrijblijvend · Geen account nodig om te beginnen
        </p>
      </div>
    </div>
  );
}
