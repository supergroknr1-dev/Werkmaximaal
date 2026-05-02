"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WachtwoordVeld from "../../components/WachtwoordVeld";
import SpamVelden, { useSpamVelden } from "../../components/SpamVelden";

const PENDING_KEY = "werkmaximaal_pending_klus";
const AUTO_PLAATSEN_KEY = "werkmaximaal_auto_plaatsen";

export default function VoltooienPage() {
  const router = useRouter();
  const [pendingKlus, setPendingKlus] = useState(null);
  // welk blok is open: "keuze" (default) | "inloggen" | "registreren"
  const [modus, setModus] = useState("keuze");

  // Inlog-form
  const [logEmail, setLogEmail] = useState("");
  const [logWachtwoord, setLogWachtwoord] = useState("");
  // Registreer-form
  const spam = useSpamVelden();
  const [regVoornaam, setRegVoornaam] = useState("");
  const [regAchternaam, setRegAchternaam] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regWachtwoord, setRegWachtwoord] = useState("");

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  useEffect(() => {
    try {
      const opgeslagen = sessionStorage.getItem(PENDING_KEY);
      if (opgeslagen) {
        setPendingKlus(JSON.parse(opgeslagen));
      }
    } catch {
      // negeer
    }
  }, []);

  async function inloggen(e) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: logEmail, wachtwoord: logWachtwoord }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inloggen mislukt.");
      sessionStorage.setItem(AUTO_PLAATSEN_KEY, "1");
      router.push("/aanvraag");
      router.refresh();
    } catch (err) {
      setFout(err.message);
      setBezig(false);
    }
  }

  async function registreren(e) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    try {
      const naam = `${regVoornaam.trim()} ${regAchternaam.trim()}`.trim();
      // Adres-gegevens uit de klus overnemen in het profiel zodat de
      // consument deze niet nogmaals hoeft in te vullen.
      const adres = pendingKlus
        ? {
            postcode: pendingKlus.postcode || "",
            huisnummer: pendingKlus.huisnummer || "",
            straatnaam: pendingKlus.straatnaam || "",
            plaats: pendingKlus.plaats || "",
          }
        : {};
      const regRes = await fetch("/api/registreren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol: "consument",
          email: regEmail,
          wachtwoord: regWachtwoord,
          naam,
          voornaam: regVoornaam.trim(),
          achternaam: regAchternaam.trim(),
          ...adres,
          ...spam.body(),
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "Registreren mislukt.");
      }
      // Direct daarna inloggen zodat de klus geplaatst kan worden
      const logRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, wachtwoord: regWachtwoord }),
      });
      if (!logRes.ok) {
        throw new Error("Account aangemaakt, maar automatisch inloggen mislukte. Probeer handmatig in te loggen.");
      }
      sessionStorage.setItem(AUTO_PLAATSEN_KEY, "1");
      router.push("/aanvraag");
      router.refresh();
    } catch (err) {
      setFout(err.message);
      setBezig(false);
    }
  }

  function vergeetKlus() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem(AUTO_PLAATSEN_KEY);
    } catch {}
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/aanvraag"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar de klus
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Bijna klaar — laten we uw klus plaatsen
          </h1>
          <p className="text-sm text-slate-500">
            Uw klus is opgeslagen. Maak gratis een account aan of log in om
            door te gaan.
          </p>
        </header>

        {pendingKlus && (
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-5 mb-6">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Uw klus
            </p>
            <p className="text-sm text-slate-900 font-medium mb-1.5">
              {pendingKlus.titel || "(zonder omschrijving)"}
            </p>
            <p className="text-xs text-slate-500">
              {pendingKlus.postcode} {pendingKlus.huisnummer}
              {pendingKlus.categorie && (
                <>
                  <span className="mx-1.5">·</span>
                  {pendingKlus.categorie}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={vergeetKlus}
              className="mt-3 text-[11px] text-slate-500 hover:text-slate-900 underline"
            >
              ← Wijzig gegevens
            </button>
          </div>
        )}

        {!pendingKlus && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 text-sm text-amber-900">
            Geen klus-gegevens gevonden. Ga{" "}
            <Link href="/" className="underline font-semibold">
              terug naar de homepage
            </Link>{" "}
            om uw klus opnieuw in te vullen.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* Blok 1 — al een account */}
          <section
            className={`bg-white border rounded-md shadow-sm transition-all ${
              modus === "registreren" ? "border-slate-200 opacity-60" : "border-slate-200"
            }`}
          >
            <div className="p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Ik heb al een account
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Log in en plaats uw klus direct.
              </p>
              {modus !== "registreren" && (
                <form onSubmit={inloggen} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      value={logEmail}
                      onChange={(e) => setLogEmail(e.target.value)}
                      onFocus={() => setModus("inloggen")}
                      autoComplete="email"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Wachtwoord
                    </label>
                    <WachtwoordVeld
                      value={logWachtwoord}
                      onChange={(e) => setLogWachtwoord(e.target.value)}
                      onFocus={() => setModus("inloggen")}
                      autoComplete="current-password"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bezig || !pendingKlus}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors"
                  >
                    {bezig && modus === "inloggen"
                      ? "Bezig..."
                      : "Inloggen & klus plaatsen"}
                  </button>
                  <p className="text-center pt-1">
                    <Link
                      href="/wachtwoord-vergeten"
                      className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                    >
                      Wachtwoord vergeten?
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </section>

          {/* Blok 2 — nieuw, alleen consument */}
          <section
            className={`bg-white border rounded-md shadow-sm transition-all ${
              modus === "inloggen"
                ? "border-slate-200 opacity-60"
                : "border-orange-200 ring-1 ring-orange-100"
            }`}
          >
            <div className="p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Ik ben nieuw hier
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Maak in 30 seconden een gratis account.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mb-4">
                <li>✓ Gratis account</li>
                <li>✓ Direct contact met vakmannen</li>
                <li>✓ Beoordeel achteraf en help anderen</li>
              </ul>
              {modus !== "inloggen" && (
                <form onSubmit={registreren} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Voornaam
                      </label>
                      <input
                        type="text"
                        value={regVoornaam}
                        onChange={(e) => setRegVoornaam(e.target.value)}
                        onFocus={() => setModus("registreren")}
                        autoComplete="given-name"
                        required
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Achternaam
                      </label>
                      <input
                        type="text"
                        value={regAchternaam}
                        onChange={(e) => setRegAchternaam(e.target.value)}
                        onFocus={() => setModus("registreren")}
                        autoComplete="family-name"
                        required
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      onFocus={() => setModus("registreren")}
                      autoComplete="email"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Wachtwoord{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        (min 8 tekens)
                      </span>
                    </label>
                    <WachtwoordVeld
                      value={regWachtwoord}
                      onChange={(e) => setRegWachtwoord(e.target.value)}
                      onFocus={() => setModus("registreren")}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <SpamVelden state={spam} />
                  <button
                    type="submit"
                    disabled={bezig || !pendingKlus}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors"
                  >
                    {bezig && modus === "registreren"
                      ? "Bezig..."
                      : "Maak gratis account & plaats klus →"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {modus !== "keuze" && (
          <button
            type="button"
            onClick={() => {
              setModus("keuze");
              setFout(null);
            }}
            className="text-[11px] text-slate-500 hover:text-slate-900 mt-4"
          >
            ← Terug naar keuze
          </button>
        )}

        {fout && (
          <div className="bg-rose-50 border border-rose-200 rounded-md px-4 py-3 mt-4 text-sm text-rose-800">
            {fout}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Uw klusgegevens worden bewaard tot u inlogt of zich registreert.
        </p>
      </div>
    </div>
  );
}
