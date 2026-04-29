"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
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
  Map as MapIcon,
  Menu,
  X,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/consumenten", label: "Consumenten", icon: UserSquare },
  { href: "/admin/vakmannen", label: "Vakmannen", icon: Users },
  { href: "/admin/klussen", label: "Klussen", icon: ClipboardList },
  { href: "/admin/showcase", label: "Showcase", icon: Camera },
  { href: "/admin/live-monitor", label: "Live monitor", icon: MapIcon },
  { href: "/admin/activity-feed", label: "Activity feed", icon: Activity },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/mollie", label: "Mollie", icon: CreditCard },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

function Header({ adminNaam }) {
  return (
    <div className="px-5 py-5 border-b border-slate-800">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
        Werkmaximaal
      </p>
      <p className="text-base font-semibold mt-0.5">Admin Center</p>
      {adminNaam && (
        <p className="text-[11px] text-slate-500 mt-2">
          Ingelogd als{" "}
          <span className="text-slate-300">{adminNaam}</span>
        </p>
      )}
    </div>
  );
}

function NavLijst({ pathname, onNavigeer }) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const actief = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigeer}
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
  );
}

export default function Sidebar({ adminNaam }) {
  const pathname = usePathname();
  const [mobielOpen, setMobielOpen] = useState(false);

  return (
    <>
      {/* Mobiele hamburger-trigger — links in de top-balk-zone, aangezien
          IngelogdTopBar de rechterkant gebruikt voor naam+uitlog. */}
      <button
        type="button"
        onClick={() => setMobielOpen(true)}
        className="md:hidden fixed top-1.5 left-2 z-40 p-2 rounded-md text-slate-200 hover:bg-slate-800 transition-colors"
        aria-label="Menu openen"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar — vast links */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800">
        <Header adminNaam={adminNaam} />
        <NavLijst pathname={pathname} />
      </aside>

      {/* Mobiele drawer-overlay */}
      {mobielOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobielOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 text-slate-100 flex flex-col h-full shadow-xl">
            <button
              type="button"
              onClick={() => setMobielOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-slate-800"
              aria-label="Menu sluiten"
            >
              <X size={18} />
            </button>
            <Header adminNaam={adminNaam} />
            <NavLijst
              pathname={pathname}
              onNavigeer={() => setMobielOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
