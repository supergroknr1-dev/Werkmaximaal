import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isToegestaneAdminEmail } from "@/lib/admin-paths";
import GlobalShell from "@/components/GlobalShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Werkmaximaal — Vakmannen voor uw klus",
  description: "Plaats uw klus en vind een betrouwbare vakman.",
};

// De root layout leest de sessie via cookies — daarom moet hij
// per request opnieuw renderen en niet statisch worden gecached.
export const dynamic = "force-dynamic";

/**
 * Detecteer of de huidige sessie een admin is (gewone modus of
 * shadow-mode). Resultaat wordt naar GlobalShell gegeven die er een
 * toolbar van rendert. Geeft `null` voor niet-admins zodat GlobalShell
 * niets toont.
 */
async function detecteerAdminInfo() {
  const session = await getSession();
  if (!session.userId && !session.shadowAdminId) return null;

  // Shadow-mode: échte admin-id zit in shadowAdminId
  if (session.shadowAdminId) {
    const [admin, gemimickt] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.shadowAdminId },
        select: { id: true, rol: true, isAdmin: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, naam: true, bedrijfsnaam: true, email: true },
      }),
    ]);
    if (
      admin?.rol === "admin" &&
      admin?.isAdmin &&
      isToegestaneAdminEmail(admin.email) &&
      gemimickt
    ) {
      return {
        kind: "shadow",
        gemimicktNaam:
          gemimickt.bedrijfsnaam || gemimickt.naam || gemimickt.email,
      };
    }
    return null;
  }

  // Gewone admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { rol: true, isAdmin: true, email: true },
  });
  if (
    user?.rol === "admin" &&
    user?.isAdmin &&
    isToegestaneAdminEmail(user.email)
  ) {
    return { kind: "admin" };
  }
  return null;
}

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  // Doorgeven aan GlobalShell: alle info nodig voor zowel sidebar
  // (alleen consument/vakman) als topbalk (alle ingelogde rollen).
  const shellUser = user
    ? {
        rol: user.rol,
        vakmanType: user.vakmanType,
        naam: user.naam,
        voornaam: user.voornaam,
      }
    : null;

  const adminInfo = await detecteerAdminInfo();

  return (
    <html lang="nl" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <GlobalShell user={shellUser} adminInfo={adminInfo}>
          {children}
        </GlobalShell>
      </body>
    </html>
  );
}
