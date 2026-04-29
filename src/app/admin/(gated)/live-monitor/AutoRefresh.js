"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Triggert om de N seconden een server-side refresh van de pagina.
 * Next.js `router.refresh()` re-rendert Server Components zonder
 * volledige page-reload — markers updaten in-place zonder dat de
 * kaart-state (zoom/pan) verloren gaat.
 */
export default function AutoRefresh({ seconden = 60 }) {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, seconden * 1000);
    return () => clearInterval(interval);
  }, [router, seconden]);
  return null;
}
