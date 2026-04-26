"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerwijderKnop({ id }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder() {
    const bevestiging = prompt("Typ 'wis' om deze klus te verwijderen:");
    if (bevestiging?.trim().toLowerCase() !== "wis") return;
    setBezig(true);
    await fetch(`/api/klussen/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={verwijder}
      disabled={bezig}
      className="text-sm text-rose-600 hover:text-rose-800 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {bezig ? "Bezig met verwijderen..." : "Klus verwijderen"}
    </button>
  );
}
