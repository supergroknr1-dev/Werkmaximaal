"use client";

import { useRef, useState } from "react";
import ConfirmInterventionModal from "../components/ConfirmInterventionModal";

/**
 * Sovereign Guardian — Intervention helper (client-side)
 *
 * `useInterventionConfirm()` geeft je een `open(props)`-functie die de
 * `ConfirmInterventionModal` toont en pas resolve't zodra de admin
 * bevestigt of annuleert. Plus een `modal`-element dat je in je JSX
 * moet renderen.
 *
 * Voorbeeld:
 *
 *   const { open, modal } = useInterventionConfirm();
 *
 *   async function verwijder() {
 *     const ok = await open({
 *       titel: "Account verwijderen",
 *       beschrijving: "Bart Vakman (id 42)",
 *       defaultCategorie: "compliance",
 *       bevestigLabel: "Verwijderen",
 *       onBevestig: async ({ reden, actieCategorie }) => {
 *         const res = await fetch("/api/admin/vakmannen/42", {
 *           method: "DELETE",
 *           headers: interventionHeaders({ reden, actieCategorie }),
 *         });
 *         if (!res.ok) {
 *           const data = await res.json().catch(() => ({}));
 *           throw new Error(data.error || "Mislukt.");
 *         }
 *       },
 *     });
 *     if (ok) router.refresh();
 *   }
 *
 *   return <>...{modal}</>;
 *
 * onBevestig moet een Promise teruggeven (of throw'en bij fout). De
 * modal vangt errors en blijft open met de foutmelding zodat de admin
 * kan corrigeren of annuleren.
 */

export function interventionHeaders({ reden, actieCategorie }) {
  return {
    // encodeURIComponent omdat HTTP-header-waardes ASCII moeten zijn
    // en reden mag Nederlandse tekens bevatten (è, ë, etc.).
    "X-Intervention-Reden": encodeURIComponent(reden),
    "X-Intervention-Categorie": actieCategorie,
  };
}

export function useInterventionConfirm() {
  const [props, setProps] = useState(null);
  const resolverRef = useRef(null);

  function open(modalProps) {
    return new Promise((resolve) => {
      // Eerdere onafgemaakte open() → annuleren
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setProps(modalProps);
    });
  }

  function sluit(resultaat) {
    setProps(null);
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(resultaat);
  }

  const modal = (
    <ConfirmInterventionModal
      open={props !== null}
      titel={props?.titel || ""}
      beschrijving={props?.beschrijving}
      defaultCategorie={props?.defaultCategorie}
      bevestigLabel={props?.bevestigLabel}
      onAnnuleer={() => sluit(false)}
      onBevestig={async (input) => {
        // Werp errors door zodat de modal ze toont en open blijft
        await props.onBevestig(input);
        sluit(true);
      }}
    />
  );

  return { open, modal };
}
