"use client";

import React, { useState } from "react";
import { logout } from "@/app/actions/auth";

export interface ProfileUserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface ProfileStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
}

interface ProfileClientProps {
  user: ProfileUserData;
  stats: ProfileStats;
}

export function ProfileClient({ user, stats }: ProfileClientProps) {
  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: user.phone || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileFeedback(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui profil.");
      }

      setProfileFeedback({
        type: "success",
        message: data.message || "Profil berhasil diperbarui.",
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setProfileFeedback({
        type: "error",
        message: error.message || "Gagal memperbarui profil.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Konfirmasi password baru tidak cocok.",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengubah password.");
      }

      setPasswordFeedback({
        type: "success",
        message: data.message || "Password berhasil diubah.",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPasswordFeedback({
        type: "error",
        message: error.message || "Gagal mengubah password.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      {/* Header Profile Strip */}
      <div className="bg-[#0b140d] border border-[#1f2e22] p-6 rounded-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-[#162719] border-2 border-[#ccff00] flex items-center justify-center font-mono font-extrabold text-3xl text-[#ccff00] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1">
              <h1 className="text-2xl font-bold font-mono text-white">
                {user.name}
              </h1>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-[#ccff00] text-black"
                    : "bg-[#1f3324] text-[#86efac] border border-[#22c55e]/40"
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="text-sm font-mono text-neutral-400">{user.email}</p>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Member aktif sejak {memberSince}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="btn btn-ghost btn-sm font-mono text-xs border border-[#2d4032] hover:border-[#ef4444] hover:text-[#ef4444] cursor-pointer"
        >
          KELUAR (LOGOUT)
        </button>
      </div>

      {/* Stats Counter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b140d] border border-[#1f2e22] p-4 rounded-sm flex flex-col justify-between">
          <span className="text-xs font-mono text-neutral-400">TOTAL BOOKING</span>
          <span className="text-3xl font-extrabold font-mono text-white mt-2">
            {stats.totalBookings}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 mt-1">
            Riwayat reservasi lapangan
          </span>
        </div>

        <div className="bg-[#0b140d] border border-[#1f2e22] p-4 rounded-sm flex flex-col justify-between">
          <span className="text-xs font-mono text-neutral-400">BOOKING AKTIF</span>
          <span className="text-3xl font-extrabold font-mono text-[#ccff00] mt-2">
            {stats.activeBookings}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 mt-1">
            Menunggu main atau bayar
          </span>
        </div>

        <div className="bg-[#0b140d] border border-[#1f2e22] p-4 rounded-sm flex flex-col justify-between">
          <span className="text-xs font-mono text-neutral-400">SELESAI DIMAINKAN</span>
          <span className="text-3xl font-extrabold font-mono text-[#22c55e] mt-2">
            {stats.completedBookings}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 mt-1">
            Status COMPLETED
          </span>
        </div>
      </div>

      {/* Two Column Edit Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Informasi Dasar */}
        <div className="bg-[#0b140d] border border-[#1f2e22] p-6 rounded-sm space-y-5">
          <div className="border-b border-[#1b2b1e] pb-3">
            <span className="text-xs font-mono text-[#ccff00] uppercase tracking-wider">
              DATA DIRI
            </span>
            <h2 className="text-lg font-bold font-mono text-white mt-0.5">
              INFORMASI AKUN
            </h2>
          </div>

          {profileFeedback && (
            <div
              className={`p-3 text-xs font-mono rounded-xs border ${
                profileFeedback.type === "success"
                  ? "bg-[#0f2415] border-[#22c55e] text-[#86efac]"
                  : "bg-[#291114] border-[#ef4444] text-[#fca5a5]"
              }`}
            >
              {profileFeedback.message}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                ALAMAT EMAIL (PERMANEN)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full bg-[#142017] border border-[#223326] text-neutral-500 text-xs px-3 py-2.5 rounded-sm font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                NAMA LENGKAP
              </label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) =>
                  setProfileData({ ...profileData, name: e.target.value })
                }
                className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                NOMOR TELEPON / WHATSAPP
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
                placeholder="0812-3456-7890"
                className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="btn-accent w-full py-2.5 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
              >
                {profileLoading ? "MENYIMPAN..." : "SIMPAN PERUBAHAN PROFIL"}
              </button>
            </div>
          </form>
        </div>

        {/* Form Ubah Password */}
        <div className="bg-[#0b140d] border border-[#1f2e22] p-6 rounded-sm space-y-5">
          <div className="border-b border-[#1b2b1e] pb-3">
            <span className="text-xs font-mono text-[#ccff00] uppercase tracking-wider">
              AUTENTIKASI
            </span>
            <h2 className="text-lg font-bold font-mono text-white mt-0.5">
              GANTI PASSWORD
            </h2>
          </div>

          {passwordFeedback && (
            <div
              className={`p-3 text-xs font-mono rounded-xs border ${
                passwordFeedback.type === "success"
                  ? "bg-[#0f2415] border-[#22c55e] text-[#86efac]"
                  : "bg-[#291114] border-[#ef4444] text-[#fca5a5]"
              }`}
            >
              {passwordFeedback.message}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                PASSWORD SAAT INI
              </label>
              <input
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                PASSWORD BARU (MIN. 8 KARAKTER, HURUF & ANGKA)
              </label>
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                KONFIRMASI PASSWORD BARU
              </label>
              <input
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn btn-secondary w-full py-2.5 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? "MEMPERBARUI..." : "PERBARUI PASSWORD"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
