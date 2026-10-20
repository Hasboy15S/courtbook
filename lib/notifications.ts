import { prisma } from "@/lib/db";

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "HOLD_EXPIRING"
  | "PAYMENT_SUCCESS"
  | "REVIEW_SUBMITTED"
  | "SYSTEM";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export interface NotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<void>;
}

/**
 * Provider Notifikasi In-App: Menyimpan notifikasi langsung ke PostgreSQL
 */
export class InAppNotificationProvider implements NotificationProvider {
  name = "IN_APP";

  async send(payload: NotificationPayload): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link || null,
        },
      });
    } catch (err) {
      console.error("[InAppNotificationProvider] Gagal menyimpan notifikasi:", err);
    }
  }
}

/**
 * Provider Notifikasi Email (Interface terpasang - siap dikaitkan ke Resend / SendGrid / Nodemailer)
 */
export class EmailNotificationProvider implements NotificationProvider {
  name = "EMAIL";

  async send(payload: NotificationPayload): Promise<void> {
    // Siap dihubungkan dengan SMTP_HOST / RESEND_API_KEY saat deployment produksi
    if (process.env.NODE_ENV !== "production") {
      console.log(`[EMAIL DISPATCH - STUB] To User ${payload.userId} | ${payload.title}: ${payload.message}`);
    }
  }
}

/**
 * Provider Notifikasi WhatsApp (Interface terpasang - siap dikaitkan ke Twilio / Fonnte / WABA)
 */
export class WhatsAppNotificationProvider implements NotificationProvider {
  name = "WHATSAPP";

  async send(payload: NotificationPayload): Promise<void> {
    // Siap dihubungkan dengan WA_GATEWAY_TOKEN saat deployment produksi
    if (process.env.NODE_ENV !== "production") {
      console.log(`[WHATSAPP DISPATCH - STUB] To User ${payload.userId} | ${payload.title}: ${payload.message}`);
    }
  }
}

// Registry provider aktif
const providers: NotificationProvider[] = [
  new InAppNotificationProvider(),
  new EmailNotificationProvider(),
  new WhatsAppNotificationProvider(),
];

/**
 * Fungsi utama pengiriman notifikasi multi-channel
 */
export async function notifyUser(payload: NotificationPayload): Promise<void> {
  await Promise.allSettled(providers.map((p) => p.send(payload)));
}
