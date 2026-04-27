"use client";

import { useRef, useState } from "react";

export default function KvkUpload({ huidigeUrl, huidigeNaam, onUploaded }) {
  const inputRef = useRef(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState("");
  const [sleept, setSleept] = useState(false);

  async function verwerk(file) {
    if (!file) return;
    setFoutmelding("");
    setBezig(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/kvk-uittreksel", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setFoutmelding(data.error || "Upload mislukt.");
      setBezig(false);
      return;
    }
    onUploaded(data.url, data.naam);
    setBezig(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        KvK-uittreksel{" "}
        <span className="text-slate-400 font-normal text-xs">(optioneel)</span>
      </label>

      <div
        onClick={() => !bezig && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSleept(true);
        }}
        onDragLeave={() => setSleept(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSleept(false);
          verwerk(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          sleept
            ? "border-slate-900 bg-slate-50"
            : "border-slate-300 hover:border-slate-500 bg-white"
        } ${bezig ? "cursor-wait opacity-60" : ""}`}
      >
        {bezig ? (
          <p className="text-sm text-slate-500 animate-pulse">
            Bezig met uploaden...
          </p>
        ) : huidigeUrl ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-slate-900 font-medium">{huidigeNaam}</span>
            <span className="text-slate-500">— klik om te vervangen</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-700 font-medium mb-1">
              Sleep uw uittreksel hierin of klik om te uploaden
            </p>
            <p className="text-xs text-slate-500">PDF, JPG of PNG · max 5 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => verwerk(e.target.files[0])}
        />
      </div>

      {foutmelding && (
        <p className="text-sm text-rose-600 mt-2">{foutmelding}</p>
      )}
    </div>
  );
}
