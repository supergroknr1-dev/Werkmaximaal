"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  User,
  Search,
  MessageSquare,
  Calendar,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";

const ITEMS_CONSUMENT = [
  { href: "/dashboard", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/mijn-klussen", label: "Mijn klussen", icon: ClipboardList },
  { href: "/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/profiel", label: "Profiel", icon: User },
];

const ITEMS_VAKMAN = [
  { href: "/dashboard", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/", label: "Beschikbare klussen", icon: Search, exact: true },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/mijn-leads", label: "Mijn leads", icon: Briefcase },
  { href: "/profiel", label: "Profiel", icon: User },
];

function rolBadgeText(rol, vakmanType) {
  if (rol === "consument") return "Consument";
  if (rol === "vakman") {
    if (vakmanType === "professional") return "Vakman";
    if (vakmanType === "hobbyist") return "Buurtklusser";
    return "Vakman";
  }
  return "";
}

function rolBadgeKleur(rol, vakmanType) {
  if (rol === "consument") return "bg-amber-500/20 text-amber-200 border-amber-500/30";
  if (vakmanType === "hobbyist") return "bg-blue-500/20 text-blue-200 border-blue-500/30";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
}

function NavLijst({ items, pathname, onNavigeer }) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const actief = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigeer}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors relative ${
              actief
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {actief && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
            )}
            <Icon size={16} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Header({ rol, vakmanType }) {
  return (
    <div className="px-5 py-5 border-b border-slate-800">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-semibold">
          W
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-tight">
            Werkmaximaal
          </p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Mijn omgeving
          </p>
        </div>
      </div>
      <span
        className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${rolBadgeKleur(
          rol,
          vakmanType
        )}`}
      >
        {rolBadgeText(rol, vakmanType)}
      </span>
    </div>
  );
}

function Voet() {
  return (
    <div className="px-3 py-4 border-t border-slate-800">
      <Link
        href="/"
        className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Terug naar site
      </Link>
    </div>
  );
}

export default function IngelogdSidebar({ rol, vakmanType, naam }) {
  const pathname = usePathname();
  const [mobielOpen, setMobielOpen] = useState(false);

  const items =
    rol === "consument" ? ITEMS_CONSUMENT : ITEMS_VAKMAN;

  return (
    <>
      {/* Mobiele top-balk met hamburger */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold">
            W
          </div>
          <span className="text-sm font-semibold">Mijn omgeving</span>
        </div>
        <button
          type="button"
          onClick={() => setMobielOpen(true)}
          className="p-1.5 rounded hover:bg-slate-800"
          aria-label="Menu openen"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Desktop sidebar — vast links */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800 z-20">
        <Header rol={rol} vakmanType={vakmanType} />
        <NavLijst items={items} pathname={pathname} />
        <Voet />
      </aside>

      {/* Mobiele drawer-overlay */}
      {mobielOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
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
            <Header rol={rol} vakmanType={vakmanType} />
            <NavLijst
              items={items}
              pathname={pathname}
              onNavigeer={() => setMobielOpen(false)}
            />
            <Voet />
          </aside>
        </div>
      )}
    </>
  );
}
