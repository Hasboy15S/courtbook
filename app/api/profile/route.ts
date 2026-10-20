import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100).optional(),
  phone: z.string().max(20, "Nomor telepon maksimal 20 digit").optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .regex(/[a-zA-Z]/, "Password baru harus mengandung huruf")
    .regex(/[0-9]/, "Password baru harus mengandung angka")
    .optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = UpdateProfileSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const updateData: { name?: string; phone?: string | null; password?: string } = {};

    if (validated.name && validated.name.trim() !== user.name) {
      updateData.name = validated.name.trim();
    }

    if (validated.phone !== undefined) {
      updateData.phone = validated.phone ? validated.phone.trim() : null;
    }

    // Jika ingin ganti password
    if (validated.newPassword) {
      if (!validated.currentPassword) {
        return NextResponse.json(
          { success: false, message: "Password saat ini wajib diisi untuk mengubah password." },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(validated.currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Password saat ini tidak sesuai." },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(validated.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada perubahan data.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil Anda berhasil diperbarui.",
      user: updatedUser,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memperbarui profil." },
      { status: 400 }
    );
  }
}
