"use client";

import { useRouter } from "next/navigation";
import {
  PaintBucket,
  Droplet,
  Zap,
  Leaf,
  Hammer,
  Drill,
  Construction,
  Home as HomeIcon,
} from "lucide-react";

const HANDOFF_KEY = "werkmaximaal_aanvraag_handoff";

// Klik op een tegel pre-filt categorie + navigeert naar /aanvraag.
// Gebruikt door anon/consument visitors. Handoff via sessionStorage.
const POPULAIRE_BEROEPEN = [
  { naam: "Schilder", Icon: PaintBucket, accent: "text-orange-600", bg: "bg-orange-50" },
  { naam: "Loodgieter", Icon: Droplet, accent: "text-sky-600", bg: "bg-sky-50" },
  { naam: "Elektricien", Icon: Zap, accent: "text-amber-500", bg: "bg-amber-50" },
  { naam: "Tuinman", Icon: Leaf, accent: "text-emerald-600", bg: "bg-emerald-50" },
  { naam: "Klusjesman", Icon: Hammer, accent: "text-slate-700", bg: "bg-slate-100" },
  { naam: "Timmerman", Icon: Drill, accent: "text-amber-700", bg: "bg-amber-50" },
  { naam: "Stratenmaker", Icon: Construction, accent: "text-stone-600", bg: "bg-stone-100" },
  { naam: "Dakdekker", Icon: HomeIcon, accent: "text-rose-600", bg: "bg-rose-50" },
];

export default function PopulaireBeroepen({ beroepenAantal }) {
  const router = useRouter();

  function kiesPopulairBeroep(beroep) {
    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ categorie: beroep })
      );
    } catch {}
    router.push("/aanvraag");
  }

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 p-5 md:p-7">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-slate-900 tracking-tight">
              Of kies direct een vakman
            </h3>
            <p className="text-xs md:text-sm text-slate-500">
              Klik op een beroep om uw klus snel te plaatsen.
            </p>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            {beroepenAantal}+ beroepen beschikbaar
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
          {POPULAIRE_BEROEPEN.map(({ naam, Icon, accent, bg }) => (
            <button
              key={naam}
              type="button"
              onClick={() => kiesPopulairBeroep(naam)}
              className="group relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`w-11 h-11 md:w-12 md:h-12 rounded-lg ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <Icon size={22} className={accent} strokeWidth={1.8} />
              </div>
              <span className="text-xs md:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                {naam}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
