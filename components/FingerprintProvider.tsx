"use client";
import { createContext, useContext, useEffect, useState } from "react";

// Déclaration des types pour Fingerprint2 (CDN)
declare global {
  interface Window {
    Fingerprint2?: {
      get: (
        callback: (components: { value: unknown }[]) => void
      ) => void;
      x64hash128: (str: string, seed: number) => string;
    };

  }
}

const FpCtx = createContext<string>("");
export const useFingerprint = () => useContext(FpCtx);

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).toUpperCase().padStart(8, "0");
}

function fallback(): string {
  return hashStr(
    [
      navigator.language,
      navigator.platform,
      `${screen.width}x${screen.height}`,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency ?? "",
      navigator.userAgent.slice(0, 80),
    ].join("|")
  );
}

export function FingerprintProvider({ children }: { children: React.ReactNode }) {
  const [fp, setFp] = useState("");

  useEffect(() => {
    const run = () => {
      if (window.Fingerprint2) {
        window.Fingerprint2.get((components) => {
          const vals = components.map((c) => c.value);
          const raw = window.Fingerprint2!.x64hash128(vals.join(""), 31);
          setFp(raw.substring(0, 12).toUpperCase());
        });
      } else {
        setFp(fallback());
      }
    };

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.4/fingerprint2.min.js";
    script.onload = () => {
      if (window.requestIdleCallback) window.requestIdleCallback(run);
      else setTimeout(run, 500);
    };
    script.onerror = () => setFp(fallback());
    document.head.appendChild(script);
  }, []);

  return <FpCtx.Provider value={fp}>{children}</FpCtx.Provider>;
}