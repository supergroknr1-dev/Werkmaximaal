"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

async function fetchAdres(postcode, huisnummer) {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${postcode}+huisnummer:${huisnummer}&fq=type:adres&fl=weergavenaam,straatnaam,huisnummer,woonplaatsnaam,postcode&rows=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    if (
      doc.postcode !== postcode ||
      String(doc.huisnummer) !== String(huisnummer)
    ) {
      return null;
    }
    return {
      straatnaam: doc.straatnaam,
      huisnummer: String(doc.huisnummer),
      postcode: doc.postcode,
      plaats: doc.woonplaatsnaam,
    };
  } catch {
    return null;
  }
}

export default function ProfielForm({ user }) {
  const router = useRouter();
  const isVakman = user.rol === "vakman";
  const isProfessional = user.vakmanType === "professional";
  const isConsument = user.rol === "consument";

  const [voornaam, setVoornaam] = useState(user.voornaam ?? "");
  const [achternaam, setAchternaam] = useState(user.achternaam ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [telefoon, setTelefoon] = useState(user.telefoon ?? "");

  const [postcode, setPostcode] = useState(user.postcode ?? "");
  const [huisnummer, setHuisnummer] = useState(user.huisnummer ?? "");
  const [toevoeging, setToevoeging] = useState(user.huisnummerToevoeging ?? "");
  const [straatnaam, setStraatnaam] = useState(user.straatnaam ?? "");
  const [plaats, setPlaats] = useState(user.plaats ?? "");
  const [adresStatus, setAdresStatus] = useState(
    user.straatnaam && user.plaats ? "ok" : "leeg"
  );

  const [bedrijfsnaam, setBedrijfsnaam] = useState(user.bedrijfsnaam ?? "");
  const [regioPostcode, setRegioPostcode] = useState(user.regioPostcode ?? "");
  const [werkafstand, setWerkafstand] = useState(user.werkafstand ?? "");

  const [bezig, setBezig] = useState(false);
  const [boodschap, setBoodschap] = useState(null);
  const [succesAnimatie, setSuccesAnimatie] = useState(false);

  // Automatische PDOK-lookup zodra postcode (6 tekens) en huisnummer
  // zijn ingevuld. Werkt met een korte debounce zodat we niet bij
  // elke toetsaanslag een request doen.
  useEffect(() => {
    if (!isConsument) return;

    const schoonPc = postcode.trim().toUpperCase();
    const schoonHnr = huisnummer.trim();

    if (!schoonPc && !schoonHnr) {
      setAdresStatus("leeg");
      setStraatnaam("");
      setPlaats("");
      return;
    }
    if (schoonPc.length < 6 || !schoonHnr) {
      setAdresStatus("typen");
      return;
    }
    if (!POSTCODE_REGEX.test(schoonPc)) {
      setAdresStatus("fout");
      setStraatnaam("");
      setPlaats("");
      return;
    }

    setAdresStatus("bezig");
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const adres = await fetchAdres(schoonPc, schoonHnr);
      if (geannuleerd) return;
      if (adres) {
        setStraatnaam(adres.straatnaam);
        setPlaats(adres.plaats);
        setAdresStatus("ok");
      } else {
        setStraatnaam("");
        setPlaats("");
        setAdresStatus("fout");
      }
    }, 250);

    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [postcode, huisnummer, isConsument]);

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    setBoodschap(null);
    setSuccesAnimatie(false);

    if (
      isConsument &&
      (postcode.trim() || huisnummer.trim()) &&
      adresStatus !== "ok"
    ) {
      setBoodschap({
        type: "error",
        tekst:
          "Adres is nog niet gevalideerd. Vul postcode en huisnummer juist in of laat ze leeg.",
      });
      setBezig(false);
      return;
    }

    const body = {
      voornaam,
      achternaam,
      naam: user.naam,
      email,
      telefoon,
      straatnaam,
      huisnummer,
      huisnummerToevoeging: toevoeging,
      persoonsPostcode: postcode,
      persoonsPlaats: plaats,
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
    setSuccesAnimatie(true);
    setBezig(false);
    setTimeout(() => setSuccesAnimatie(false), 2400);
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
        <div className="pt-2 mt-2 border-t border-slate-100">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
            Persoonlijk adres
          </p>

          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Postcode
              </label>
              <input
                type="text"
                value={postcode}
                onChange={(e) =>
                  setPostcode(e.target.value.toUpperCase().slice(0, 6))
                }
                maxLength={6}
                placeholder="1234AB"
                autoComplete="postal-code"
                className={`w-full px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors text-sm uppercase tracking-wider font-mono ${
                  adresStatus === "fout"
                    ? "border-rose-300 focus:border-rose-400"
                    : "border-slate-300 focus:border-slate-900"
                }`}
              />
            </div>
            <div className="col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Huisnummer
              </label>
              <input
                type="text"
                value={huisnummer}
                onChange={(e) =>
                  setHuisnummer(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))
                }
                inputMode="numeric"
                placeholder="12"
                className={`w-full px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors text-sm font-mono ${
                  adresStatus === "fout"
                    ? "border-rose-300 focus:border-rose-400"
                    : "border-slate-300 focus:border-slate-900"
                }`}
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Toevoeging
              </label>
              <input
                type="text"
                value={toevoeging}
                onChange={(e) => setToevoeging(e.target.value.slice(0, 8))}
                maxLength={8}
                placeholder="A"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 mb-2">
            <div className="col-span-7">
              <label className="block text-sm font-medium text-slate-500 mb-2">
                Straatnaam{" "}
                <span className="text-slate-400 font-normal text-xs">
                  (automatisch)
                </span>
              </label>
              <input
                type="text"
                value={straatnaam}
                readOnly
                placeholder="—"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
            <div className="col-span-5">
              <label className="block text-sm font-medium text-slate-500 mb-2">
                Plaats{" "}
                <span className="text-slate-400 font-normal text-xs">
                  (automatisch)
                </span>
              </label>
              <input
                type="text"
                value={plaats}
                readOnly
                placeholder="—"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="min-h-[1.5rem]">
            {adresStatus === "bezig" && (
              <p className="text-xs text-slate-500 animate-pulse">
                Bezig met opzoeken...
              </p>
            )}
            {adresStatus === "ok" && (
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                <Check size={13} strokeWidth={2.5} />
                Adres gevonden
              </p>
            )}
            {adresStatus === "fout" && (
              <p className="text-xs text-rose-600">
                Adres niet gevonden, controleer uw gegevens.
              </p>
            )}
          </div>
        </div>
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

      {boodschap && !succesAnimatie && (
        <p
          className={`text-sm ${
            boodschap.type === "ok" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {boodschap.tekst}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          {bezig ? "Opslaan..." : "Wijzigingen opslaan"}
        </button>

        {succesAnimatie && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 animate-[fadeIn_0.3s_ease-out]">
            <span className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
              <Check size={16} strokeWidth={3} className="text-emerald-700" />
            </span>
            Opgeslagen!
          </span>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pop {
          0% {
            transform: scale(0);
          }
          70% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </form>
  );
}
