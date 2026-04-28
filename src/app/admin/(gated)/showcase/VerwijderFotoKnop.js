"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  useInterventionConfirm,
  interventionHeaders,
} from "../../../../lib/intervention-api";

export default function VerwijderFotoKnop({ fotoId, naam }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const { open: bevestigIngreep, modal: ingreepModal } = useInterventionConfirm();

  async function verwijder() {
    const ok = await bevestigIngreep({
      titel: "Showcase-foto verwijderen",
      beschrijving: `Foto van ${naam} (foto-id ${fotoId})`,
      defaultCategorie: "compliance",
      bevestigLabel: "Verwijderen",
      onBevestig: async ({ reden, actieCategorie }) => {
        setBezig(true);
        try {
          const res = await fetch(`/api/admin/showcase/${fotoId}`, {
            method: "DELETE",
            headers: interventionHeaders({ reden, actieCategorie }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Verwijderen mislukt.");
          }
        } finally {
          setBezig(false);
        }
      },
    });
    if (ok) router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={verwijder}
        disabled={bezig}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
      >
        <Trash2 size={12} />
        {bezig ? "Bezig..." : "Verwijderen"}
      </button>
      {ingreepModal}
    </>
  );
}
