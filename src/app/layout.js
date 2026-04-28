import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import GlobalShell from "@/components/GlobalShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Werkmaximaal — Vakmensen voor uw klus",
  description: "Plaats uw klus en vind een betrouwbare vakman.",
};

// De root layout leest de sessie via cookies — daarom moet hij
// per request opnieuw renderen en niet statisch worden gecached.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  // Iedere ingelogde consument/vakman krijgt de globale sidebar — ook
  // admins (zij zien hem op alle niet-/admin-pagina's). De /admin-layout
  // gebruikt zijn eigen sidebar, dus GlobalShell verbergt zichzelf op
  // /admin-paden via de pathname-check.
  const sidebarUser =
    user && (user.rol === "consument" || user.rol === "vakman")
      ? {
          rol: user.rol,
          vakmanType: user.vakmanType,
          naam: user.naam,
        }
      : null;

  return (
    <html lang="nl" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <GlobalShell user={sidebarUser}>{children}</GlobalShell>
      </body>
    </html>
  );
}
