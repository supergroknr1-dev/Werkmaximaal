import { prisma } from "./prisma";
import { getSession } from "./session";

export async function getCurrentUser() {
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
}
