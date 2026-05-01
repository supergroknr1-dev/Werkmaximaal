"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Copy, Check } from "lucide-react";

export default function MfaSetupPage() {
  const router = useRouter();
  const [setup, setSetup] = useState(null); // { qrDataUrl, secret }
  const [code, setCode] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    let actief = true;
    (async () => {
      const res = await fetch("/api/admin/mfa/setup");
      const data = await res.json().catch(() => ({}));
      if (!actief) return;
      if (!res.ok) {
        setFout(data.error || "Setup-data ophalen mislukt.");
        return;
      }
      setSetup(data);
    })();
    return () => {
      actief = false;
    };
  }, []);

  async function verify(e) {
    e.preventDefault();
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.error || "Code klopt niet.");
        return;
      }
      setRecoveryCodes(data.recoveryCodes);
    } finally {
      setBezig(false);
    }
  }

  function kopieerSecret() {
    if (!setup?.secret) return;
    navigator.clipboard.writeText(setup.secret);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  function rondAf() {
    router.push("/admin");
    router.refresh();
  }

  // STAP 3: Recovery codes tonen (eenmalig)
  if (recoveryCodes) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 text-orange-400 text-xs uppercase tracking-widest mb-3 justify-center">
            <ShieldCheck size={14} />
            MFA actief
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-2">
              Bewaar je recovery-codes
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Bewaar deze codes <span className="text-amber-400 font-semibold">nu</span> op een veilige plek (wachtwoordmanager). Je ziet ze niet nogmaals. Elke code werkt één keer als je je telefoon kwijt bent.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-slate-950 border border-slate-800 rounded p-4 mb-5">
              {recoveryCodes.map((c) => (
                <div key={c} className="text-slate-200 tracking-wider">
                  {c}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(recoveryCodes.join("\n"));
                setGekopieerd(true);
                setTimeout(() => setGekopieerd(false), 2000);
              }}
              className="w-full text-xs text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded py-2 mb-3 transition-colors"
            >
              {gekopieerd ? "✓ Gekopieerd" : "Kopieer alle codes"}
            </button>
            <button
              type="button"
              onClick={rondAf}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              Naar admin-center →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STAP 1 + 2: QR scannen en code verifiëren
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-3 justify-center">
          <ShieldCheck size={14} />
          MFA verplicht
        </div>
        <h1 className="text-xl font-semibold text-white text-center mb-1 tracking-tight">
          Beveilig je admin-account
        </h1>
        <p className="text-xs text-slate-400 text-center mb-6">
          Eénmalige setup — daarna vraag ik bij elke login om een code.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 md:p-8 space-y-5">
          {fout && !setup && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded px-3 py-2">
              {fout}
            </p>
          )}

          {setup && (
            <>
              <div>
                <p className="text-xs text-slate-300 mb-3 font-medium">
                  1. Scan deze QR-code met Google Authenticator, 1Password, Authy of een andere TOTP-app:
                </p>
                <div className="bg-white p-3 rounded mx-auto w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrDataUrl}
                    alt="MFA QR-code"
                    width={240}
                    height={240}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-center">
                Kun je de QR niet scannen? Voer dit handmatig in:
                <button
                  type="button"
                  onClick={kopieerSecret}
                  className="ml-1 inline-flex items-center gap-1 text-slate-300 hover:text-white font-mono"
                >
                  {setup.secret}
                  {gekopieerd ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>

              <form onSubmit={verify} className="space-y-3 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-300 font-medium">
                  2. Voer de 6-cijferige code in die de app genereert:
                </p>
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
                {fout && <p className="text-xs text-rose-400">{fout}</p>}
                <button
                  type="submit"
                  disabled={bezig || code.length !== 6}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
                >
                  {bezig ? "Bezig..." : "Bevestigen"}
                </button>
              </form>
            </>
          )}

          {!setup && !fout && (
            <p className="text-xs text-slate-400 text-center py-8">
              QR-code wordt geladen...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
