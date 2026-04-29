"use client";

import dynamic from "next/dynamic";

/**
 * Wrapper die LiveKaartInner alleen client-side laadt. react-leaflet
 * gebruikt window/document op module-niveau — dat crasht tijdens SSR.
 * `ssr: false` werkt alleen vanuit een Client Component, vandaar deze
 * dunne tussenlaag.
 */
const LiveKaartInner = dynamic(() => import("./LiveKaartInner"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[500px] rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
      Kaart laden…
    </div>
  ),
});

export default function LiveKaart(props) {
  return <LiveKaartInner {...props} />;
}
