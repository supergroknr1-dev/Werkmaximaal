"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Herbruikbaar wachtwoord-input met oog-toggle.
 *
 * Gebruik 'm net als een normale `<input>` — alle props worden
 * doorgegeven aan het input-element. De toggle-knop rechts in
 * het veld wisselt tussen `type="password"` en `type="text"`.
 *
 * Voorbeeld:
 *   <WachtwoordVeld
 *     value={huidig}
 *     onChange={(e) => setHuidig(e.target.value)}
 *     required
 *     autoComplete="current-password"
 *     className="w-full text-sm border border-slate-300 rounded px-2.5 py-1.5"
 *   />
 *
 * `tabIndex={-1}` op de toggle-knop zorgt dat tabben door het formulier
 * de oog-knoppen overslaat — de admin tabt natuurlijk van veld naar veld.
 */
export default function WachtwoordVeld({ className = "", ...inputProps }) {
  const [zichtbaar, setZichtbaar] = useState(false);
  return (
    <div className="relative">
      <input
        {...inputProps}
        type={zichtbaar ? "text" : "password"}
        className={`pr-9 ${className}`}
      />
      <button
        type="button"
        onClick={() => setZichtbaar((z) => !z)}
        tabIndex={-1}
        aria-label={zichtbaar ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
      >
        {zichtbaar ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
