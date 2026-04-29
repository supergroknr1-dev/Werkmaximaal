"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const KLEUREN = {
  nieuw: "#3b82f6", // blue-500
  "chat-actief": "#f97316", // orange-500
  wachtend: "#94a3b8", // slate-400
};

const STATUS_LABEL = {
  nieuw: "Nieuw",
  "chat-actief": "Chat actief",
  wachtend: "Wachtend",
};

/**
 * Bouwt een gekleurd cirkel-icoon voor de marker. Leaflet's default-pin
 * vereist losse PNG-bestanden die niet automatisch laden in Next.js
 * builds; divIcon met inline-HTML omzeilt dat probleem en geeft ons
 * direct kleur-controle.
 */
function maakIcon(kleur) {
  return L.divIcon({
    className: "live-kaart-marker",
    html: `<div style="width:18px;height:18px;background:${kleur};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LiveKaart({ punten }) {
  // Memoize icons zodat ze niet bij elke render opnieuw gemaakt worden
  const iconen = useMemo(
    () => ({
      nieuw: maakIcon(KLEUREN.nieuw),
      "chat-actief": maakIcon(KLEUREN["chat-actief"]),
      wachtend: maakIcon(KLEUREN.wachtend),
    }),
    []
  );

  if (punten.length === 0) {
    return (
      <div className="h-[600px] rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Nog geen actieve klussen om te tonen.
      </div>
    );
  }

  return (
    <div className="h-[70vh] min-h-[500px] rounded-md overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={[52.15, 5.3]}
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {punten.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={iconen[p.status]}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-semibold text-slate-900 text-sm mb-1">
                  {p.titel}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  {p.categorie || "Geen categorie"} · {p.plaats} ({p.postcode})
                </p>
                <p className="text-[11px] text-slate-500 mb-1">
                  Geplaatst: {formatDatum(p.aangemaakt)}
                </p>
                <p className="text-[11px] text-slate-500 mb-2">
                  Leads gekocht: {p.aantalLeads}
                </p>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded inline-block"
                  style={{
                    background: KLEUREN[p.status] + "22",
                    color: KLEUREN[p.status],
                  }}
                >
                  {STATUS_LABEL[p.status]}
                </p>
                <a
                  href={`/admin/klussen`}
                  className="block mt-2 text-[11px] text-emerald-700 hover:underline"
                >
                  Bekijk in admin →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
