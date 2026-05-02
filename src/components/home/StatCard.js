"use client";

import { useState, useEffect } from "react";
import { Hammer, ClipboardCheck, Building } from "lucide-react";

// Icoon-keuze via key i.p.v. component-prop, omdat server → client
// component refs niet serializable zijn in RSC.
const ICONS = {
  hammer: Hammer,
  clipboard: ClipboardCheck,
  building: Building,
};

// Count-up van 0 → target zodra het element in beeld komt. Gebruikt
// IntersectionObserver + requestAnimationFrame, geen externe library.
// Callback-ref via setNode zodat we ook werken als het element pas
// later mount. target=0 → animatie wordt overgeslagen.
function useCountUp(target, duration = 1400) {
  const [waarde, setWaarde] = useState(0);
  const [gestart, setGestart] = useState(false);
  const [node, setNode] = useState(null);

  useEffect(() => {
    if (!node || gestart) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setGestart(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, gestart]);

  useEffect(() => {
    if (!gestart || target == null) return;
    // Target=0 → niets te animeren, voorkom rAF-loop voor lege DB.
    if (target === 0) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setWaarde(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gestart, target, duration]);

  return [setNode, waarde];
}

export default function StatCard({
  target,
  label,
  sublabel,
  iconKey,
  variant = "white",
}) {
  const [tellerRef, waarde] = useCountUp(target);
  const Icon = ICONS[iconKey] || Hammer;

  const styles =
    variant === "orange-fill"
      ? {
          bg: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
          iconBg: "bg-white/20",
          iconColor: "text-white",
          number: "text-white",
          label: "text-white",
          sublabel: "text-orange-100",
        }
      : variant === "dark"
      ? {
          bg: "bg-slate-900 text-white",
          iconBg: "bg-orange-500/20",
          iconColor: "text-orange-400",
          number: "text-white",
          label: "text-white",
          sublabel: "text-slate-400",
        }
      : {
          bg: "bg-white border border-slate-200",
          iconBg: "bg-orange-50",
          iconColor: "text-orange-600",
          number: "text-slate-900",
          label: "text-slate-900",
          sublabel: "text-slate-500",
        };

  return (
    <div
      ref={tellerRef}
      className={`relative overflow-hidden rounded-2xl p-6 md:p-7 shadow-sm ${styles.bg}`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center mb-4`}
      >
        <Icon size={22} className={styles.iconColor} strokeWidth={1.8} />
      </div>
      <p
        className={`text-4xl md:text-5xl font-bold tracking-tight tabular-nums ${styles.number}`}
      >
        {(waarde || 0).toLocaleString("nl-NL")}
      </p>
      <p className={`mt-2 text-sm font-semibold ${styles.label}`}>{label}</p>
      <p className={`text-xs ${styles.sublabel}`}>{sublabel}</p>
    </div>
  );
}
