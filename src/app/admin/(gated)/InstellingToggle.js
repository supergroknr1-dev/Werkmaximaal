"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InstellingToggle({ instelling, beginWaarde, label, omschrijving }) {
  const router = useRouter();
  const [waarde, setWaarde] = useState(beginWaarde);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");

  async function toggle() {
    setBezig(true);
    setFoutmelding("");
    const nieuw = !waarde;
    const res = await fetch("/api/instellingen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [instelling]: nieuw }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFoutmelding(data.error || "Er ging iets mis.");
      setBezig(false);
      return;
    }
    setWaarde(nieuw);
    setBezig(false);
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {omschrijving && (
          <p className="text-xs text-slate-500 mt-1">{omschrijving}</p>
        )}
        {foutmelding && (
          <p className="text-xs text-rose-600 mt-1">{foutmelding}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={waarde}
        onClick={toggle}
        disabled={bezig}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
          waarde ? "bg-slate-900" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
            waarde ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
