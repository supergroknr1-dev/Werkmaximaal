import { prisma } from "../../../lib/prisma";

// Publieke vertrouwens-tellers voor de homepage. Cijfers zijn pas
// zichtbaar als de drempel in de homepage-component is bereikt — zo
// blijft de social-proof-sectie verborgen tot er voldoende data is.
export async function GET() {
  const [vakmannen, klussen] = await Promise.all([
    prisma.user.count({ where: { rol: "vakman" } }),
    prisma.klus.count({ where: { gesloten: true } }),
  ]);

  return Response.json({ vakmannen, klussen });
}
