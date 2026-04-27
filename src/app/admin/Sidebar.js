"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserSquare,
  ClipboardList,
  Settings,
  ArrowLeft,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/consumenten", label: "Consumenten", icon: UserSquare },
  { href: "/admin/vakmannen", label: "Vakmannen", icon: Users },
  { href: "/admin/klussen", label: "Klussen", icon: ClipboardList },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

export default function Sidebar({ adminNaam }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Werkmaximaal
        </p>
        <p className="text-base font-semibold mt-0.5">Admin Center</p>
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

      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        {adminNaam && (
          <p className="text-xs text-slate-400 px-2">
            Ingelogd als{" "}
            <span className="text-white font-medium">{adminNaam}</span>
          </p>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Terug naar site
        </Link>
      </div>
    </aside>
  );
}
