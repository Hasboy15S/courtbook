import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container min-h-[70vh] flex items-center justify-center py-16">
      <div className="max-w-md w-full bg-[#0b140d] border border-[#233527] p-8 rounded-sm text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Court Line Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#142618] border border-[#ccff00]/40 rounded-full text-xs font-mono text-[#ccff00]">
          <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-ping"></span>
          OUT OF BOUNDS // 404
        </div>

        {/* Big Scoreboard Number */}
        <div className="font-mono font-extrabold text-7xl md:text-8xl text-white tracking-widest selection:bg-[#ccff00] selection:text-black">
          4<span className="text-[#ccff00]">0</span>4
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-mono text-white tracking-tight">
            BOLA KELUAR LAPANGAN!
          </h1>
          <p className="text-xs text-neutral-400 font-mono leading-relaxed">
            Halaman atau jadwal venue yang Anda tuju tidak berada dalam garis batas permainan. Periksa kembali URL atau kembali ke arena utama.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-accent w-full sm:w-auto px-6 py-2.5 text-xs font-mono font-bold tracking-wider"
          >
            KEMBALI KE BERANDA
          </Link>
          <Link
            href="/venues"
            className="btn btn-secondary w-full sm:w-auto px-6 py-2.5 text-xs font-mono font-bold tracking-wider"
          >
            JELAJAHI LAPANGAN
          </Link>
        </div>
      </div>
    </div>
  );
}
