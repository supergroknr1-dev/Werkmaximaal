"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StopShadowKnop() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function stop() {
    setBezig(true);
    try {
      await fetch("/api/admin/shadow/stop", { method: "POST" });
      router.push("/admin/vakmannen");
      router.refresh();
    } finally {
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={stop}
      disabled={bezig}
      className="text-xs font-semibold bg-amber-200 hover:bg-amber-300 disabled:opacity-50 px-3 py-1 rounded shrink-0"
    >
      {bezig ? "Bezig..." : "Stop shadowen"}
    </button>
  );
}
