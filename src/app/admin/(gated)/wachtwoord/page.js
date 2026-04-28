import WachtwoordForm from "./WachtwoordForm";

export default function WachtwoordPage() {
  return (
    <>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Account
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Wachtwoord wijzigen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Stel een nieuw wachtwoord in voor je admin-account. Je MFA-instelling
          blijft hetzelfde.
        </p>
      </header>

      <div className="max-w-md">
        <WachtwoordForm />
      </div>
    </>
  );
}
