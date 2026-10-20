import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      settlement_time,
    } = payload;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { message: "Payload tidak lengkap." },
        { status: 400 }
      );
    }

    // 1. Verifikasi signature key secara timing-safe
    const isValidSignature = verifyMidtransSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    );

    if (!isValidSignature) {
      console.error(`Invalid Midtrans signature for order: ${order_id}`);
      return NextResponse.json(
        { message: "Signature key tidak valid." },
        { status: 400 }
      );
    }

    // 2. Cari data Payment & Booking terkait
    const payment = await prisma.payment.findUnique({
      where: { orderId: order_id },
      include: {
        booking: {
          include: { court: true },
        },
      },
    });

    if (!payment) {
      console.warn(`Payment dengan order_id ${order_id} tidak ditemukan.`);
      // Tetap kembalikan 200 agar Midtrans tidak terus mengulang pengiriman
      return NextResponse.json(
        { message: "Order tidak ditemukan di sistem CourtBook." },
        { status: 200 }
      );
    }

    const currentBooking = payment.booking;

    // 3. IDEMPOTENSI & URUTAN NOTIFIKASI:
    // Jangan pernah menurunkan booking yang sudah CONFIRMED / PAID kembali ke status pending
    if (
      currentBooking.paymentStatus === PaymentStatus.PAID &&
      (transaction_status === "pending" || transaction_status === "challenge")
    ) {
      return NextResponse.json(
        { message: "Status sudah final PAID. Mengabaikan notifikasi mundur." },
        { status: 200 }
      );
    }

    // 4. Pemetaan Status
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess) {
      // EDGE CASE: Cek apakah saat hold habis, slot sempat diambil oleh orang lain
      const conflictCheck = await prisma.booking.findMany({
        where: {
          courtId: currentBooking.courtId,
          date: currentBooking.date,
          id: { not: currentBooking.id },
          status: { in: [BookingStatus.CONFIRMED] },
          AND: [
            { startTime: { lt: currentBooking.endTime } },
            { endTime: { gt: currentBooking.startTime } },
          ],
        },
      });

      if (conflictCheck.length > 0) {
        // Terjadi double-book edge case (slot telah diambil orang lain saat hold lewat)
        console.warn(
          `[EDGE CASE - REFUND DIHARUSKAN] Order ${order_id} dibayar saat slot sudah diisi booking ${conflictCheck[0].id}.`
        );

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              transactionStatus: "settlement",
              paymentType: payment_type || payment.paymentType,
              transactionId: transaction_id || payment.transactionId,
              rawNotification: payload,
              paidAt: settlement_time ? new Date(settlement_time) : new Date(),
            },
          });

          await tx.booking.update({
            where: { id: currentBooking.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              notes: `[REFUND_NEEDED] Pembayaran diterima setelah batas hold habis dan slot telah diisi pengguna lain (${conflictCheck[0].id}). Hubungi admin untuk pengembalian dana manual.`,
            },
          });
        });

        return NextResponse.json(
          { message: "Notifikasi tercatat. Refund diperlukan." },
          { status: 200 }
        );
      }

      // Normal Success: Konfirmasi Booking & Set Payment PAID
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            transactionStatus: "settlement",
            fraudStatus: fraud_status || "accept",
            paymentType: payment_type || payment.paymentType,
            transactionId: transaction_id || payment.transactionId,
            paidAt: settlement_time ? new Date(settlement_time) : new Date(),
            rawNotification: payload,
          },
        });

        await tx.booking.update({
          where: { id: currentBooking.id },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
          },
        });
      });

      await notifyUser({
        userId: currentBooking.userId,
        title: "Pembayaran Terkonfirmasi!",
        message: `Pembayaran untuk Order #${order_id} berhasil. Jadwal main Anda telah terkonfirmasi.`,
        type: "PAYMENT_SUCCESS",
        link: "/my-bookings",
      });

      return NextResponse.json(
        { message: "Pembayaran berhasil dikonfirmasi. Booking CONFIRMED." },
        { status: 200 }
      );
    }

    if (transaction_status === "pending") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          transactionStatus: "pending",
          rawNotification: payload,
        },
      });

      return NextResponse.json(
        { message: "Menunggu pembayaran diselesaikan." },
        { status: 200 }
      );
    }

    if (["deny", "cancel", "failure"].includes(transaction_status)) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            transactionStatus: transaction_status,
            rawNotification: payload,
          },
        });

        await tx.booking.update({
          where: { id: currentBooking.id },
          data: {
            status: BookingStatus.CANCELLED,
            paymentStatus: PaymentStatus.REJECTED,
            cancelReason: `Pembayaran Midtrans gagal (${transaction_status})`,
            cancelledAt: new Date(),
          },
        });
      });

      return NextResponse.json(
        { message: `Pembayaran gagal atau dibatalkan (${transaction_status}).` },
        { status: 200 }
      );
    }

    if (transaction_status === "expire") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            transactionStatus: "expire",
            rawNotification: payload,
          },
        });

        await tx.booking.update({
          where: { id: currentBooking.id },
          data: {
            status: BookingStatus.EXPIRED,
            paymentStatus: PaymentStatus.UNPAID,
          },
        });
      });

      return NextResponse.json(
        { message: "Sesi pembayaran telah kedaluwarsa." },
        { status: 200 }
      );
    }

    // Default update raw notification
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionStatus: transaction_status,
        rawNotification: payload,
      },
    });

    return NextResponse.json({ message: "Notifikasi diterima." }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Midtrans webhook error:", err);
    return NextResponse.json(
      { message: "Internal server error saat memproses notifikasi." },
      { status: 500 }
    );
  }
}
