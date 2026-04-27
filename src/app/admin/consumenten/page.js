import { prisma } from "../../../lib/prisma";
import ConsumentenTabel from "./ConsumentenTabel";

export default async function AdminConsumentenPage() {
  const consumenten = await prisma.user.findMany({
    where: { rol: "consument" },
    orderBy: { aangemaakt: "desc" },
    select: {
      id: true,
      naam: true,
      voornaam: true,
      achternaam: true,
      email: true,
      telefoon: true,
      adres: true,
      postcode: true,
      plaats: true,
      isAdmin: true,
      aangemaakt: true,
      klussen: {
        select: { id: true, categorie: true },
      },
    },
  });

  const rijen = consumenten.map((c) => {
    const categorieen = [
      ...new Set(
        c.klussen
          .map((k) => k.categorie)
          .filter((cat) => cat && cat.trim().length > 0)
      ),
    ].sort();
    return {
      id: c.id,
      naam: c.naam,
      voornaam: c.voornaam,
      achternaam: c.achternaam,
      email: c.email,
      telefoon: c.telefoon,
      adres: c.adres,
      postcode: c.postcode,
      plaats: c.plaats,
      isAdmin: c.isAdmin,
      aangemaakt: c.aangemaakt.toISOString(),
      klussenCount: c.klussen.length,
      categorieen,
    };
  });

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
          {rijen.length} aanvrager{rijen.length === 1 ? "" : "s"} — volledig
          overzicht van klantgegevens en hun klussen.
        </p>
      </header>

      <ConsumentenTabel consumenten={rijen} />
    </>
  );
}
