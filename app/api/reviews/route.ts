import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { notifyUser } from "@/lib/notifications";

const CreateReviewSchema = z.object({
  bookingId: z.string().min(1, "ID Booking wajib diisi"),
  rating: z.number().int().min(1, "Rating minimal 1 bintang").max(5, "Rating maksimal 5 bintang"),
  comment: z.string().max(500, "Ulasan maksimal 500 karakter").optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu untuk memberikan ulasan." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = CreateReviewSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: validated.bookingId },
      include: {
        court: {
          include: { venue: true },
        },
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Data booking tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hanya pemilik booking yang dapat memberikan ulasan
    if (booking.userId !== session.userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses untuk mengulas booking ini." },
        { status: 403 }
      );
    }

    // Ulasan hanya untuk booking COMPLETED
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          message: "Ulasan hanya dapat diberikan setelah waktu bermain selesai (status COMPLETED).",
        },
        { status: 400 }
      );
    }

    // Maksimal 1 ulasan per booking
    if (booking.review) {
      return NextResponse.json(
        {
          success: false,
          message: "Ulasan untuk booking ini sudah pernah diberikan sebelumnya.",
        },
        { status: 409 }
      );
    }

    const newReview = await prisma.review.create({
      data: {
        bookingId: booking.id,
        userId: session.userId,
        venueId: booking.court.venue.id,
        rating: validated.rating,
        comment: validated.comment ? validated.comment.trim() : null,
      },
    });

    // Kirim notifikasi in-app
    await notifyUser({
      userId: session.userId,
      title: "Ulasan Berhasil Dikirim",
      message: `Terima kasih! Ulasan bintang ${validated.rating} Anda untuk ${booking.court.venue.name} telah tersimpan.`,
      type: "REVIEW_SUBMITTED",
      link: `/venues/${booking.court.venue.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Ulasan berhasil disimpan. Terima kasih atas masukan Anda!",
        review: newReview,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal menyimpan ulasan." },
      { status: 400 }
    );
  }
}
