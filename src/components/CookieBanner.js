"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "werkmaximaal_cookie_accepted";

/**
 * Onopvallende cookie-notificatie onderaan het scherm. Werkmaximaal
 * gebruikt alleen één strikt-noodzakelijke sessie-cookie (vereist géén
 * toestemming volgens AVG/ePrivacy), maar veel NL-gebruikers
 * verwachten een notificatie. Dit is dus eerder een transparantie-
 * banner dan een consent-flow.
 *
 * Toestemming wordt opgeslagen in localStorage zodat de banner pas
 * weer verschijnt als de gebruiker z'n storage clear't of een ander
 * device gebruikt.
 *
 * Tonen alleen op publieke pagina's — admin-context en auth-flows
 * verbergen 'm via GlobalShell.
 */
export default function CookieBanner() {
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Mini-delay zodat de banner niet meteen op page-load springt
        const t = setTimeout(() => setZichtbaar(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage geblokkeerd (incognito strict, etc.) — toon banner
      setZichtbaar(true);
    }
  }, []);

  function accepteer() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Negeer; banner blijft volgende keer wel weer verschijnen
    }
    setZichtbaar(false);
  }

  if (!zichtbaar) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto bg-slate-900 text-slate-100 rounded-lg shadow-lg p-4 pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1 text-xs sm:text-sm leading-relaxed">
            Wij gebruiken alleen één{" "}
            <strong>functionele sessie-cookie</strong> om je login te
            onthouden. Geen tracking, geen advertenties, geen externe
            analytics-cookies. Meer info in onze{" "}
            <Link
              href="/privacy"
              className="underline hover:text-white"
            >
              privacyverklaring
            </Link>{" "}
            en{" "}
            <Link
              href="/voorwaarden"
              className="underline hover:text-white"
            >
              algemene voorwaarden
            </Link>
            .
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={accepteer}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap"
            >
              OK
            </button>
            <button
              type="button"
              onClick={accepteer}
              aria-label="Sluiten"
              className="text-slate-400 hover:text-white p-1.5 rounded-md sm:self-start"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
