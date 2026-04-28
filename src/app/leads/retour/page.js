import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { verwerkLeadPayment } from "../../../lib/lead-creatie";
import { getSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

/**
 * Mollie redirect-handler. Mollie geeft geen payment-id mee in de
 * redirect-URL — die hebben we bij checkout in de iron-session
 * opgeslagen onder `pendingLeadPayment`. Hier lezen we 'm terug,
 * verifiëren we de status en wissen we 'm.
 *
 * 1. Lees paymentId uit sessie (en wis 'm direct)
 * 2. verwerkLeadPayment(paymentId) → status + Lead (idempotent)
 * 3. Toon juiste boodschap; bij 'paid' redirect naar de klus.
 */
export default async function LeadRetourPage({ searchParams }) {
  const params = await searchParams;
  const klusId = params?.klusId;

  const session = await getSession();
  const paymentId = session.pendingLeadPayment;
  // Eénmalig consumeren: ook bij fouten wissen we de pending zodat
  // refresh-loops niet opnieuw verifiëren.
  if (paymentId) {
    delete session.pendingLeadPayment;
    await session.save();
  }

  if (!paymentId) {
    return (
      <Mismatch
        klusId={klusId}
        reden="Geen lopende betaling in deze sessie. Heb je de pagina misschien herladen?"
      />
    );
  }

  let resultaat;
  try {
    resultaat = await verwerkLeadPayment(paymentId, null);
  } catch (err) {
    console.error("[leads-retour] verwerk-fout:", err);
    return <Mismatch klusId={klusId} reden="Kon de betaling niet verifiëren." />;
  }

  if (resultaat.status === "paid" || resultaat.status === "al-aanwezig") {
    redirect(`/klussen/${resultaat.klusId}?lead=ok`);
  }

  if (resultaat.status === "pending") {
    return <Pending klusId={resultaat.klusId || klusId} />;
  }

  return <Mislukt klusId={resultaat.klusId || klusId} />;
}

function Pending({ klusId }) {
  return (
    <Wrap>
      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
        <Clock size={22} />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 text-center mb-2">
        Betaling wordt nog verwerkt
      </h1>
      <p className="text-sm text-slate-600 text-center mb-6">
        We hebben nog geen definitieve bevestiging van de bank. Zodra de
        betaling binnen is, verschijnt je lead vanzelf op je dashboard. Je kunt
        deze pagina sluiten.
      </p>
      {klusId && (
        <Link
          href={`/klussen/${klusId}`}
          className="block text-center text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          Terug naar de klus
        </Link>
      )}
    </Wrap>
  );
}

function Mislukt({ klusId }) {
  return (
    <Wrap>
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
        <XCircle size={22} />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 text-center mb-2">
        Betaling is niet gelukt
      </h1>
      <p className="text-sm text-slate-600 text-center mb-6">
        De betaling is niet voltooid (geannuleerd, mislukt of verlopen). Je
        bent niets verschuldigd. Probeer het opnieuw vanaf de klus-pagina als
        je alsnog wilt reageren.
      </p>
      {klusId && (
        <Link
          href={`/klussen/${klusId}`}
          className="block text-center text-sm font-medium px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800"
        >
          Terug naar de klus
        </Link>
      )}
    </Wrap>
  );
}

function Mismatch({ klusId, reden }) {
  return (
    <Wrap>
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
        <XCircle size={22} />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 text-center mb-2">
        Onbekende status
      </h1>
      <p className="text-sm text-slate-600 text-center mb-6">{reden}</p>
      {klusId && (
        <Link
          href={`/klussen/${klusId}`}
          className="block text-center text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          Terug naar de klus
        </Link>
      )}
    </Wrap>
  );
}

function Wrap({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <div className="w-full max-w-md mt-16 bg-white border border-slate-200 rounded-lg shadow-sm p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
