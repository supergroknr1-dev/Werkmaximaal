export default function ScoreBadge({ score, size = "sm" }) {
  if (!score || score.aantal === 0) {
    return (
      <span className="text-[11px] text-slate-400 italic">
        nog geen reviews
      </span>
    );
  }
  const { gemiddelde, aantal } = score;
  const afgerond = Math.round(gemiddelde * 10) / 10;
  const heleSterren = Math.round(gemiddelde);
  const tekstKlasse = size === "lg" ? "text-sm" : "text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 ${tekstKlasse}`}
      title={`${afgerond.toFixed(1).replace(".", ",")} uit 5 op basis van ${aantal} review${aantal === 1 ? "" : "s"}`}
    >
      <span className="text-amber-500" aria-hidden="true">
        {"★".repeat(heleSterren)}
        <span className="text-slate-300">{"★".repeat(5 - heleSterren)}</span>
      </span>
      <span className="text-slate-600 font-medium">
        {afgerond.toFixed(1).replace(".", ",")}
      </span>
      <span className="text-slate-400">
        ({aantal})
      </span>
    </span>
  );
}
