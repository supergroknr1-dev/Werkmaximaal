"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfielForm({ user }) {
  const router = useRouter();
  const isVakman = user.rol === "vakman";
  const isProfessional = user.vakmanType === "professional";

  const [naam, setNaam] = useState(user.naam ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [telefoon, setTelefoon] = useState(user.telefoon ?? "");
  const [bedrijfsnaam, setBedrijfsnaam] = useState(user.bedrijfsnaam ?? "");
  const [regioPostcode, setRegioPostcode] = useState(user.regioPostcode ?? "");
  const [werkafstand, setWerkafstand] = useState(user.werkafstand ?? "");
  const [bezig, setBezig] = useState(false);
  const [boodschap, setBoodschap] = useState(null);

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    setBoodschap(null);

    const body = { naam, email, telefoon };
    if (isVakman) {
      if (isProfessional) body.bedrijfsnaam = bedrijfsnaam;
      body.regioPostcode = regioPostcode;
      if (werkafstand !== "") body.werkafstand = werkafstand;
    }

    const res = await fetch("/api/profiel", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBoodschap({ type: "error", tekst: data.error || "Opslaan is mislukt." });
      setBezig(false);
      return;
    }
    setBoodschap({ type: "ok", tekst: "Wijzigingen opgeslagen." });
    setBezig(false);
    router.refresh();
  }

  return (
    <form onSubmit={opslaan} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Volledige naam
        </label>
        <input
          type="text"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          E-mailadres
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">
          Wij gebruiken dit adres om u in te laten loggen en te informeren.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Telefoonnummer{" "}
          <span className="text-slate-400 font-normal text-xs">(optioneel)</span>
        </label>
        <input
          type="tel"
          value={telefoon}
          onChange={(e) => setTelefoon(e.target.value)}
          placeholder="0612345678"
          autoComplete="tel"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
        />
      </div>

      {isVakman && isProfessional && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Bedrijfsnaam
          </label>
          <input
            type="text"
            value={bedrijfsnaam}
            onChange={(e) => setBedrijfsnaam(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            KvK-nummer kan niet worden gewijzigd. Neem contact op met de
            administratie als dit nodig is.
          </p>
        </div>
      )}

      {isVakman && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Werkgebied (postcode)
            </label>
            <input
              type="text"
              value={regioPostcode}
              onChange={(e) =>
                setRegioPostcode(e.target.value.toUpperCase().slice(0, 6))
              }
              maxLength={6}
              placeholder="1234AB"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm uppercase tracking-wider font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Werkafstand (km)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={werkafstand}
              onChange={(e) => setWerkafstand(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-slate-900 transition-colors text-sm font-mono"
            />
          </div>
        </div>
      )}

      {boodschap && (
        <p
          className={`text-sm ${
            boodschap.type === "ok" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {boodschap.tekst}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
      >
        {bezig ? "Opslaan..." : "Wijzigingen opslaan"}
      </button>
    </form>
  );
}
