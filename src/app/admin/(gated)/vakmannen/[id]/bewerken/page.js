import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../../../../../lib/prisma";
import BewerkForm from "./BewerkForm";
import WachtwoordReset from "./WachtwoordReset";

export default async function VakmanBewerkenPage({ params }) {
  const { id } = await params;
  const vakmanId = parseInt(id);
  if (Number.isNaN(vakmanId)) notFound();

  const vakman = await prisma.user.findUnique({
    where: { id: vakmanId },
    select: {
      id: true,
      email: true,
      naam: true,
      voornaam: true,
      achternaam: true,
      rol: true,
      bedrijfsnaam: true,
      kvkNummer: true,
      kvkUittrekselUrl: true,
      kvkUittrekselNaam: true,
      werkTelefoon: true,
      priveTelefoon: true,
      vakmanType: true,
      straatnaam: true,
      huisnummer: true,
      huisnummerToevoeging: true,
      postcode: true,
      plaats: true,
      werkafstand: true,
      regioPostcode: true,
      regioPlaats: true,
      werkgebiedenExtra: {
        select: { id: true, type: true, waarde: true, werkafstand: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!vakman || vakman.rol !== "vakman") notFound();

  return (
    <>
      <header className="mb-8">
        <Link
          href="/admin/vakmannen"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-3 transition-colors"
        >
          ← Terug naar vakmannen
        </Link>
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center · Vakman bewerken
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {vakman.bedrijfsnaam || vakman.naam}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Account-id #{vakman.id} · {vakman.email}
        </p>
      </header>

      <BewerkForm vakman={JSON.parse(JSON.stringify(vakman))} />

      <div className="mt-6 max-w-2xl">
        <WachtwoordReset
          vakmanId={vakman.id}
          vakmanNaam={vakman.bedrijfsnaam || vakman.naam}
          vakmanEmail={vakman.email}
        />
      </div>
    </>
  );
}
