import { prisma } from "../../../lib/prisma";
import { getInstellingen } from "../../../lib/instellingen";

// Publieke vertrouwens-tellers voor de homepage. Admin kan via
// /admin/instellingen kiezen tussen live tellen of handmatig instellen.
export async function GET() {
  const instellingen = await getInstellingen();

  if (instellingen.statsHandmatig) {
    return Response.json({
      vakmannen: instellingen.statsVakmannenWaarde ?? 0,
      klussen: instellingen.statsKlussenWaarde ?? 0,
      handmatig: true,
    });
  }

  const [vakmannen, klussen] = await Promise.all([
    prisma.user.count({ where: { rol: "vakman" } }),
    prisma.klus.count(),
  ]);

  return Response.json({ vakmannen, klussen, handmatig: false });
}
