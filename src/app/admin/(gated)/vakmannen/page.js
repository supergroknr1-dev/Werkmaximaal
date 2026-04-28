import { prisma } from "../../../../lib/prisma";
import VakmannenTabel from "./VakmannenTabel";

export default async function VakmannenPage() {
  const vakmannen = await prisma.user.findMany({
    where: { rol: "vakman" },
    orderBy: { aangemaakt: "desc" },
    select: {
      id: true,
      naam: true,
      email: true,
      bedrijfsnaam: true,
      vakmanType: true,
      kvkNummer: true,
      regioPostcode: true,
      aangemaakt: true,
    },
  });

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Vakmannen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {vakmannen.length} aanmeldingen — filter, zoek en beheer accounts.
        </p>
      </header>

      <VakmannenTabel vakmannen={JSON.parse(JSON.stringify(vakmannen))} />
    </>
  );
}
