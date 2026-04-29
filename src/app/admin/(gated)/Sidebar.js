"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserSquare,
  ClipboardList,
  Settings,
  Activity,
  ScrollText,
  Camera,
  CreditCard,
  LogOut,
} from "lucide-react";
import { ADMIN_LOGIN_PATH } from "../../../lib/admin-paths";

const ITEMS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/consumenten", label: "Consumenten", icon: UserSquare },
  { href: "/admin/vakmannen", label: "Vakmannen", icon: Users },
  { href: "/admin/klussen", label: "Klussen", icon: ClipboardList },
  { href: "/admin/showcase", label: "Showcase", icon: Camera },
  { href: "/admin/activity-feed", label: "Activity feed", icon: Activity },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/mollie", label: "Mollie", icon: CreditCard },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

export default function Sidebar({ adminNaam }) {
  const pathname = usePathname();
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/logout", { method: "POST" });
    // Hard redirect naar de admin-login (niet naar /), zodat de admin
    // direct opnieuw kan inloggen en niet op de publieke homepage belandt.
    router.push(ADMIN_LOGIN_PATH);
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Werkmaximaal
            </p>
            <p className="text-base font-semibold mt-0.5">Admin Center</p>
          </div>
          <button
            type="button"
            onClick={uitloggen}
            title="Uitloggen"
            className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut size={15} />
            <span className="sr-only">Uitloggen</span>
          </button>
        </div>
        {adminNaam && (
          <p className="text-[11px] text-slate-500 mt-2">
            Ingelogd als{" "}
            <span className="text-slate-300">{adminNaam}</span>
          </p>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const actief = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                actief
                  ? "bg-slate-800 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
