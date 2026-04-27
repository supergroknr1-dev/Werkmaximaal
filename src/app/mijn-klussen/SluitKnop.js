"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SluitKnop({ id, gesloten }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function toggle() {
    if (!gesloten) {
      const bevestiging = confirm(
        "Weet u zeker dat u deze klus wilt sluiten? Vakmannen kunnen er dan geen leads meer voor kopen."
      );
      if (!bevestiging) return;
    }
    setBezig(true);
    await fetch(`/api/klussen/${id}/sluiten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gesloten: !gesloten }),
    });
    router.refresh();
    setBezig(false);
  }

  if (gesloten) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={bezig}
        className="text-xs text-slate-600 hover:text-slate-900 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {bezig ? "Bezig..." : "Heropenen"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={bezig}
      className="text-xs text-slate-600 hover:text-slate-900 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {bezig ? "Bezig..." : "Klus sluiten"}
    </button>
  );
}
