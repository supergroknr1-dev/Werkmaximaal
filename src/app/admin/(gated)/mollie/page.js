import { CreditCard, Check, X, AlertTriangle, ExternalLink } from "lucide-react";
import createMollieClient from "@mollie/api-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mollie-diagnose — Werkmaximaal Admin",
};

/**
 * Pre-flight checks voor de live-mode swap. Toont:
 *   - Of MOLLIE_API_KEY gezet is en in welke mode (test/live)
 *   - Of APP_URL gezet is en wat 'ie zou moeten zijn
 *   - Wat de webhook-URL wordt
 *   - Of de Mollie API überhaupt bereikbaar is met de huidige key
 *   - Aantal payments dat al door Mollie is verwerkt
 *
 * Plus een stappenplan dat de admin handmatig op de Mollie-dashboard
 * en Vercel-dashboard moet uitvoeren om van test naar live te gaan.
 */
export default async function MollieDiagnosePage() {
  const apiKey = process.env.MOLLIE_API_KEY;
  const appUrl = process.env.APP_URL;
  const mode = apiKey?.startsWith("live_")
    ? "live"
    : apiKey?.startsWith("test_")
    ? "test"
    : null;

  // Connectivity-check: probeer 1 simpele API-call die niets muteert
  let connectivity = { ok: false, error: null, paymentCount: null };
  if (apiKey) {
    try {
      const c = createMollieClient({ apiKey });
      const list = await c.payments.page({ limit: 5 });
      connectivity.ok = true;
      connectivity.paymentCount = list?.count ?? null;
      connectivity.recente = list.map?.((p) => ({
        id: p.id,
        status: p.status,
        bedrag: p.amount?.value,
        createdAt: p.createdAt,
        method: p.method,
      })) ?? [];
    } catch (err) {
      connectivity.error = err?.message || "onbekende fout";
    }
  }

  const webhookUrl = appUrl
    ? new URL("/api/leads/mollie-webhook", appUrl).toString()
    : null;

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center · Configuratie
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight inline-flex items-center gap-2">
          <CreditCard size={22} className="text-slate-700" />
          Mollie-diagnose
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pre-flight check vóór de overgang van test- naar live-mode.
        </p>
      </header>

      <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Huidige configuratie
        </h2>
        <dl className="space-y-3 text-sm">
          <Rij
            label="MOLLIE_API_KEY"
            ok={!!apiKey}
            waarde={
              apiKey
                ? `${mode === "live" ? "🔴 LIVE" : "🟡 TEST"} ・ ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`
                : "niet gezet"
            }
          />
          <Rij
            label="APP_URL"
            ok={!!appUrl}
            waarde={appUrl || "niet gezet (webhook werkt niet)"}
          />
          <Rij
            label="Webhook-URL (auto-gebouwd)"
            ok={!!webhookUrl}
            waarde={webhookUrl || "—"}
            kleinetekst="Mollie roept dit aan na elke payment-status-wijziging"
          />
          <Rij
            label="Mollie API bereikbaar"
            ok={connectivity.ok}
            waarde={
              connectivity.ok
                ? `verbinding werkt — ${connectivity.paymentCount ?? "?"} payment${connectivity.paymentCount === 1 ? "" : "s"} in account`
                : connectivity.error
                ? `fout: ${connectivity.error}`
                : "geen API-key, niet gecheckt"
            }
          />
        </dl>
      </section>

      {connectivity.recente?.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Laatste {connectivity.recente.length} payments
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 font-medium">ID</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Bedrag</th>
                <th className="py-2 font-medium">Methode</th>
                <th className="py-2 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody>
              {connectivity.recente.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-mono">{p.id}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${statusKleur(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 tabular-nums">€ {p.bedrag}</td>
                  <td className="py-2">{p.method || "—"}</td>
                  <td className="py-2 text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleString("nl-NL") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          Stappenplan: van test- naar live-mode
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Doe deze stappen één voor één. De diagnose hierboven werkt als checklist.
        </p>
        <ol className="space-y-4 text-sm text-slate-700">
          <li>
            <p className="font-semibold text-slate-900">1. KvK-verificatie indienen bij Mollie</p>
            <p className="text-slate-600 mt-1">
              Log in op{" "}
              <a
                href="https://www.mollie.com/dashboard/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                mollie.com/dashboard
                <ExternalLink size={11} />
              </a>{" "}
              → <em>Mijn account → Bedrijfsgegevens</em>. Upload een KvK-uittreksel
              (max 1 maand oud) en bevestig de UBO. Goedkeuring duurt 1–3 werkdagen.
            </p>
          </li>
          <li>
            <p className="font-semibold text-slate-900">2. Live API-key kopiëren</p>
            <p className="text-slate-600 mt-1">
              Na goedkeuring: <em>Developers → API-keys</em>. Onder "Live keys" staat
              een sleutel beginnend met <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">live_</code>.
              Klik <em>Show</em> en kopieer.
            </p>
          </li>
          <li>
            <p className="font-semibold text-slate-900">3. Vercel env-var bijwerken</p>
            <p className="text-slate-600 mt-1">
              Op{" "}
              <a
                href="https://vercel.com/supergroknr1-2675s-projects/werkmaximaal/settings/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                vercel.com → Settings → Environment Variables
                <ExternalLink size={11} />
              </a>
              {" "}: vervang <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">MOLLIE_API_KEY</code>{" "}
              voor de Production-omgeving met de live-key. Redeploy de site (Vercel doet dat
              meestal automatisch).
            </p>
          </li>
          <li>
            <p className="font-semibold text-slate-900">4. Test op productie</p>
            <p className="text-slate-600 mt-1">
              Refresh deze pagina — bovenstaande config moet nu 🔴 LIVE tonen. Doe
              een echte lead-aankoop op werkmaximaal.vercel.app (kost een klein bedrag,
              meestal € 5-10). Als de betaling slaagt en de lead in <em>Mijn leads</em>
              verschijnt: de productie-flow werkt.
            </p>
          </li>
          <li>
            <p className="font-semibold text-slate-900">5. Webhook-bevestiging</p>
            <p className="text-slate-600 mt-1">
              Na de testbetaling: kijk hierboven of er een <em>paid</em>-payment in de tabel
              staat. Mollie roept <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">{webhookUrl || "[APP_URL]/api/leads/mollie-webhook"}</code>{" "}
              automatisch aan. Als de betaling als <em>paid</em> verschijnt is dat dubbel
              bevestigd: redirect-flow én webhook werken.
            </p>
          </li>
        </ol>

        {mode === "live" && (
          <div className="mt-5 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 inline-flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>
              <strong>Live-mode actief.</strong> Vanaf nu kosten lead-aankopen
              echt geld. Niet meer testen met dummy-betalingen.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function Rij({ label, ok, waarde, kleinetekst }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        {ok ? (
          <Check size={16} className="text-emerald-600" />
        ) : (
          <X size={16} className="text-rose-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </dt>
        <dd className="text-sm text-slate-900 break-all font-mono">{waarde}</dd>
        {kleinetekst && (
          <p className="text-[11px] text-slate-500 mt-0.5">{kleinetekst}</p>
        )}
      </div>
    </div>
  );
}

function statusKleur(status) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "open":
    case "pending":
    case "authorized":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "failed":
    case "canceled":
    case "expired":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}
