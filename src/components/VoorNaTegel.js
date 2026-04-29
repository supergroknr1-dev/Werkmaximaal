/**
 * Split-view voor een Voor/Na-foto-paar binnen een aspect-square tegel.
 * Voor links, Na rechts, met dunne witte scheidingslijn en kleine labels.
 *
 * Gebruikt op:
 *   - /profiel (vakman's eigen showcase-galerij)
 *   - /vakmannen/[id] (publieke profielpagina)
 *   - /admin/showcase (moderatie-overzicht)
 */
export default function VoorNaTegel({ urlVoor, urlNa, alt }) {
  return (
    <div className="relative w-full h-full flex">
      <div className="relative w-1/2 h-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlVoor}
          alt={alt ? `Voor: ${alt}` : "Voor-foto"}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 bg-black/60 text-white rounded">
          Voor
        </span>
      </div>
      <div className="w-px bg-white shrink-0"></div>
      <div className="relative w-1/2 h-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlNa}
          alt={alt ? `Na: ${alt}` : "Na-foto"}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 bg-black/60 text-white rounded">
          Na
        </span>
      </div>
    </div>
  );
}
