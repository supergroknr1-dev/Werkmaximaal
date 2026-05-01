"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import WachtwoordVeld from "../../components/WachtwoordVeld";

export default function AdminLoginPage() {
  const router = useRouter();
  const [stap, setStap] = useState("credentials"); // 'credentials' | 'mfa'
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [code, setCode] = useState("");
  const [recoveryModus, setRecoveryModus] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function submitCredentials(e) {
    e.preventDefault();
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/management-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wachtwoord }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Inloggen mislukt.");
        return;
      }
      if (data.mfaSetupNodig) {
        router.push("/admin/mfa-setup");
        router.refresh();
        return;
      }
      if (data.mfaCodeNodig) {
        setStap("mfa");
        return;
      }
      // Geen MFA-stap nodig (zou niet mogen gebeuren voor admins, maar
      // voor de zekerheid)
      router.push("/admin");
      router.refresh();
    } finally {
      setBezig(false);
    }
  }

  async function submitMfa(e) {
    e.preventDefault();
    setBezig(true);
    setFout("");
    try {
      const body = recoveryModus
        ? { recoveryCode }
        : { code };
      const res = await fetch("/api/management-login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Verificatie mislukt.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-3 justify-center">
          <ShieldCheck size={14} />
          Admin Center
        </div>
        <h1 className="text-2xl font-semibold text-white text-center mb-8 tracking-tight">
          Sovereign Guardian
        </h1>

        {stap === "credentials" && (
          <form
            onSubmit={submitCredentials}
            className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 md:p-8 space-y-5"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
                Wachtwoord
              </label>
              <WachtwoordVeld
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
            </div>

            {fout && <p className="text-xs text-rose-400">{fout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              {bezig ? "Bezig..." : "Volgende →"}
            </button>

            <p className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800">
              Reguliere gebruiker?{" "}
              <a href="/inloggen" className="text-slate-300 hover:text-white underline">
                /inloggen
              </a>
            </p>
          </form>
        )}

        {stap === "mfa" && (
          <form
            onSubmit={submitMfa}
            className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 md:p-8 space-y-5"
          >
            <div>
              <p className="text-xs text-slate-400 mb-3">
                Voer de 6-cijferige code in uit je authenticator-app.
              </p>
              {!recoveryModus ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  placeholder="123456"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded text-slate-100 text-center text-xl tracking-[0.4em] font-mono focus:outline-none focus:border-orange-500 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  placeholder="ABCDE-12345"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded text-slate-100 text-center font-mono uppercase focus:outline-none focus:border-orange-500 transition-colors"
                />
              )}
            </div>

            {fout && <p className="text-xs text-rose-400">{fout}</p>}

            <button
              type="submit"
              disabled={bezig}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              {bezig ? "Bezig..." : "Verifiëren →"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRecoveryModus(!recoveryModus);
                setFout("");
                setCode("");
                setRecoveryCode("");
              }}
              className="w-full text-[11px] text-slate-400 hover:text-slate-200 pt-2 border-t border-slate-800"
            >
              {recoveryModus
                ? "← Toch een 6-cijferige code gebruiken"
                : "Geen toegang tot je authenticator? Gebruik een recovery-code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
