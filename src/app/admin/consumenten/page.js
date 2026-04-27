import { prisma } from "../../../lib/prisma";
import ConsumentenTabel from "./ConsumentenTabel";

export default async function AdminConsumentenPage() {
  const consumenten = await prisma.user.findMany({
    where: { rol: "consument" },
    orderBy: { aangemaakt: "desc" },
    select: {
      id: true,
      naam: true,
      email: true,
      telefoon: true,
      isAdmin: true,
      aangemaakt: true,
      _count: { select: { klussen: true } },
    },
  });

  const rijen = consumenten.map((c) => ({
    id: c.id,
    naam: c.naam,
    email: c.email,
    telefoon: c.telefoon,
    isAdmin: c.isAdmin,
    aangemaakt: c.aangemaakt.toISOString(),
    klussenCount: c._count.klussen,
  }));

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Consumenten
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {rijen.length} aanvrager{rijen.length === 1 ? "" : "s"} — overzicht
          van alle consument-accounts en hun contactgegevens.
        </p>
      </header>

      <ConsumentenTabel consumenten={rijen} />
    </>
  );
}
