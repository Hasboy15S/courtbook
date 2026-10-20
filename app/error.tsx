"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CourtBook Application Error:", error);
  }, [error]);

  return (
    <div className="container min-h-[70vh] flex items-center justify-center py-16">
      <div className="max-w-md w-full bg-[#120c0e] border border-[#3d181c] p-8 rounded-sm text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#261214] border border-[#ef4444]/40 rounded-full text-xs font-mono text-[#fca5a5]">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
          TECHNICAL FOUL // ERROR
        </div>

        <div className="font-mono font-extrabold text-5xl md:text-6xl text-[#ef4444] tracking-widest">
          FOUL!
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold font-mono text-white tracking-tight">
            TERJADI KESALAHAN PADA SISTEM
          </h1>
          <p className="text-xs text-neutral-400 font-mono leading-relaxed">
            {error.message || "Aplikasi mendeteksi interupsi tak terduga. Silakan coba kembali sesaat lagi."}
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary w-full sm:w-auto px-6 py-2.5 text-xs font-mono font-bold tracking-wider cursor-pointer"
          >
            COBA LAGI (RETRY)
          </button>
          <Link
            href="/"
            className="btn btn-secondary w-full sm:w-auto px-6 py-2.5 text-xs font-mono font-bold tracking-wider"
          >
            KEMBALI KE BERANDA
          </Link>
        </div>
      </div>
    </div>
  );
}
