import { cache } from "react";
import { prisma } from "./prisma";
import { getSession } from "./session";

// Per-request cache: layout.js + page.js mogen beiden getCurrentUser
// aanroepen zonder dubbele Prisma-query. React 19 dedupliceert binnen
// dezelfde request via deze cache().
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      naam: true,
      voornaam: true,
      rol: true,
      isAdmin: true,
      vakmanType: true,
      totpEnabled: true,
    },
  });
});
