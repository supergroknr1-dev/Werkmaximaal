import { getInstellingen } from "../../../../lib/instellingen";
import { getLeadPrijs } from "../../../../lib/lead-prijs";
import InstellingToggle from "../InstellingToggle";
import PrijsForm from "./PrijsForm";
import WachtwoordForm from "./WachtwoordForm";

export default async function AdminInstellingenPage() {
  const [instellingen, prijzen] = await Promise.all([
    getInstellingen(),
    getLeadPrijs(),
  ]);

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Instellingen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Platformbrede schakelaars en prijzen — wijzigingen werken direct door.
        </p>
      </header>

      <div className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Handige Harrie
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Schakelaar voor de gehele buurtklusser-functionaliteit.
            </p>
          </div>
          <div className="px-5">
            <InstellingToggle
              instelling="hobbyistInschakeld"
              beginWaarde={instellingen.hobbyistInschakeld}
              label="Handige Harrie inschakelen"
              omschrijving="Wanneer uitgeschakeld kunnen er geen nieuwe buurtklusser-accounts meer worden aangemaakt en kunnen consumenten geen klussen meer plaatsen die exclusief voor buurtklussers zijn. Bestaande accounts en klussen blijven werken."
            />
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Prijsbeheer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stel de basis lead-prijs in voor Vakmannen. Handige Harries betalen
              altijd het dubbele.
            </p>
          </div>
          <div className="p-5">
            <PrijsForm basisCenten={prijzen.pro} />
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Wachtwoord wijzigen
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stel een nieuw wachtwoord in voor je admin-account. Je MFA blijft
              hetzelfde.
            </p>
          </div>
          <div className="p-5">
            <WachtwoordForm />
          </div>
        </section>

      </div>
    </>
  );
}
