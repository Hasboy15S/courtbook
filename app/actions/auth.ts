"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/types";

// ---------- Schemas ----------

const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(100)
    .trim(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Format email tidak valid" }),
  password: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .regex(/[a-zA-Z]/, { message: "Password harus mengandung huruf" })
    .regex(/[0-9]/, { message: "Password harus mengandung angka" }),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

// ---------- Actions ----------

export async function register(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password, phone } = parsed.data;

  // Proteksi Rate Limiting Pendaftaran
  const limit = rateLimit(`auth:register:${email}`, 5, 60);
  if (!limit.success) {
    return {
      success: false,
      message: `Terlalu banyak percobaan pendaftaran. Silakan coba kembali dalam ${limit.resetSeconds} detik.`,
    };
  }

  // Cek email sudah terdaftar
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      success: false,
      errors: { email: ["Email sudah terdaftar"] },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, email, password: hashedPassword, phone: phone || null },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  redirect("/");
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;

  // Proteksi Rate Limiting Brute-Force Login
  const limit = rateLimit(`auth:login:${email}`, 5, 60);
  if (!limit.success) {
    return {
      success: false,
      message: `Terlalu banyak percobaan login gagal. Silakan coba kembali dalam ${limit.resetSeconds} detik.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return {
      success: false,
      message: "Email atau password salah",
    };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return {
      success: false,
      message: "Email atau password salah",
    };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
