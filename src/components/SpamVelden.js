"use client";

import { useState } from "react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Hook + component voor spam-bescherming op registratieformulieren.
 *
 * Gebruik:
 *
 *   const spam = useSpamVelden();
 *   ...
 *   const body = { ...formData, ...spam.body() };
 *   await fetch("/api/registreren", { body: JSON.stringify(body) });
 *   ...
 *   <SpamVelden state={spam} />
 *
 * `body()` voegt automatisch toe: `website`, `_t`, en — als
 * Turnstile is geconfigureerd — `cf-turnstile-response`.
 *
 * Geen Turnstile-key? De widget rendert simpelweg niet en de check
 * blijft alleen op honeypot+tijd+rate-limit. Geen registratie wordt
 * geblokkeerd doordat de key ontbreekt.
 */
export function useSpamVelden() {
  const [mountTijd] = useState(() => Date.now());
  const [website, setWebsite] = useState(""); // honeypot — moet leeg blijven
  const [turnstileToken, setTurnstileToken] = useState("");

  return {
    mountTijd,
    website,
    setWebsite,
    turnstileToken,
    setTurnstileToken,
    body() {
      return {
        website,
        _t: String(mountTijd),
        ...(turnstileToken ? { "cf-turnstile-response": turnstileToken } : {}),
      };
    },
  };
}

export default function SpamVelden({ state }) {
  return (
    <>
      {/* Honeypot — gestyled buiten beeld zodat screenreaders 'm wel
          aankondigen (label: "Laat dit veld leeg") maar niet-blinde
          gebruikers 'm nooit zien. Bots vullen 'm wel in. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Laat dit veld leeg
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={state.website}
            onChange={(e) => state.setWebsite(e.target.value)}
            name="website"
          />
        </label>
      </div>

      {/* Turnstile widget — alleen renderen als er een sitekey is */}
      {SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile mt-2"
            data-sitekey={SITE_KEY}
            data-callback="onTurnstileSuccess"
            data-theme="light"
            ref={(el) => {
              if (!el) return;
              // Stash a callback op window zodat het Cloudflare-script
              // 'm kan vinden. We luisteren via een MutationObserver
              // op het hidden response-input dat het script aanmaakt.
              window.onTurnstileSuccess = (token) => {
                state.setTurnstileToken(token);
              };
            }}
          />
        </>
      )}
    </>
  );
}
