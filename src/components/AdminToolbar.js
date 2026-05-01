"use client";

import Link from "next/link";
import { ShieldCheck, UserCog } from "lucide-react";
import StopShadowKnop from "./StopShadowKnop";

/**
 * Bovenin gefixte balk die admin laat weten dat 'ie op een publieke
 * pagina is. Twee varianten:
 *
 * 1. Gewone admin-modus → rustige donkere balk + 'Terug naar Admin Center'
 * 2. Shadow-mode → opvallende amber-balk + 'Stop shadowen'
 *
 * Krijgt z'n state als prop van de root-layout (server-side resolved
 * via getCurrentUser + session-shadow-marker). Client-component zodat
 * 'ie samen kan werken met GlobalShell die de pathname-routing doet.
 */
export default function AdminToolbar({ info }) {
  if (!info) return null;

  if (info.kind === "shadow") {
    return (
      <div className="bg-amber-100 border-b-2 border-amber-400 text-amber-900">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <UserCog size={15} />
            Shadow-mode actief — je ziet alles als{" "}
            <span className="font-semibold">{info.gemimicktNaam}</span>
          </span>
          <StopShadowKnop />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={13} className="text-orange-400" />
          Je bekijkt deze pagina als Admin.
        </span>
        <Link
          href="/admin"
          className="text-slate-300 hover:text-white underline-offset-2 hover:underline"
        >
          Terug naar Admin Center →
        </Link>
      </div>
    </div>
  );
}
