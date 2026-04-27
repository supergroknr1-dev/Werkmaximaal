"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfielForm({ user }) {
  const router = useRouter();
  const isVakman = user.rol === "vakman";
  const isProfessional = user.vakmanType === "professional";
  const isConsument = user.rol === "consument";

  const [voornaam, setVoornaam] = useState(user.voornaam ?? "");
  const [achternaam, setAchternaam] = useState(user.achternaam ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [telefoon, setTelefoon] = useState(user.telefoon ?? "");
  const [adres, setAdres] = useState(user.adres ?? "");
  const [persoonsPostcode, setPersoonsPostcode] = useState(user.postcode ?? "");
  const [persoonsPlaats, setPersoonsPlaats] = useState(user.plaats ?? "");
  const [bedrijfsnaam, setBedrijfsnaam] = useState(user.bedrijfsnaam ?? "");
  const [regioPostcode, setRegioPostcode] = useState(user.regioPostcode ?? "");
  const [werkafstand, setWerkafstand] = useState(user.werkafstand ?? "");
  const [bezig, setBezig] = useState(false);
  const [boodschap, setBoodschap] = useState(null);

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    setBoodschap(null);

    const body = {
      voornaam,
      achternaam,
      naam: user.naam,
      email,
      telefoon,
      adres,
      persoonsPostcode,
      persoonsPlaats,
    };
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Voornaam
          </label>
          <input
            type="text"
            value={voornaam}
            onChange={(e) => setVoornaam(e.target.value)}
            autoComplete="given-name"
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Achternaam
          </label>
          <input
            type="text"
            value={achternaam}
            onChange={(e) => setAchternaam(e.target.value)}
            autoComplete="family-name"
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
          />
        </div>
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

      {isConsument && (
        <>
          <div className="pt-2 mt-2 border-t border-slate-100">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Persoonlijk adres
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Straat + huisnummer
                </label>
                <input
                  type="text"
                  value={adres}
                  onChange={(e) => setAdres(e.target.value)}
                  placeholder="Bijvoorbeeld: Hoofdstraat 12"
                  autoComplete="street-address"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={persoonsPostcode}
                    onChange={(e) =>
                      setPersoonsPostcode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    maxLength={6}
                    placeholder="1234AB"
                    autoComplete="postal-code"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm uppercase tracking-wider font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plaats
                  </label>
                  <input
                    type="text"
                    value={persoonsPlaats}
                    onChange={(e) => setPersoonsPlaats(e.target.value)}
                    autoComplete="address-level2"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
