import crypto from "crypto";

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  snapApiUrl: string;
  snapJsUrl: string;
  statusApiUrl: string;
}

export function getMidtransConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return {
    serverKey,
    clientKey,
    isProduction,
    snapApiUrl: isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
    snapJsUrl: isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js",
    statusApiUrl: isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2",
  };
}

export interface SnapTransactionPayload {
  orderId: string;
  grossAmount: number;
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  customerDetails: {
    firstName: string;
    email: string;
    phone?: string;
  };
  expiryMinutes: number;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
  orderId: string;
  isMock?: boolean;
}

/**
 * Membuat transaksi Snap di server Midtrans
 */
export async function createMidtransSnapTransaction(
  payload: SnapTransactionPayload
): Promise<SnapTransactionResult> {
  const config = getMidtransConfig();

  const body = {
    transaction_details: {
      order_id: payload.orderId,
      gross_amount: Math.round(payload.grossAmount),
    },
    item_details: payload.itemDetails,
    customer_details: {
      first_name: payload.customerDetails.firstName,
      email: payload.customerDetails.email,
      phone: payload.customerDetails.phone || undefined,
    },
    expiry: {
      unit: "minutes",
      duration: Math.max(1, Math.min(15, payload.expiryMinutes)),
    },
  };

  const authString = Buffer.from(`${config.serverKey}:`).toString("base64");

  try {
    const res = await fetch(config.snapApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        token: data.token,
        redirectUrl: data.redirect_url,
        orderId: payload.orderId,
      };
    }

    // Jika kredensial sandbox belum diisi (mock key) atau server Midtrans menolak key dummy
    console.warn(`Midtrans Snap API responded with ${res.status}. Falling back to simulation mode.`);
  } catch (err) {
    console.warn("Midtrans connection error, using fallback simulation mode:", err);
  }

  // Fallback dev/mock Snap Token
  const mockToken = `MOCK_SNAP_${payload.orderId}`;
  return {
    token: mockToken,
    redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`,
    orderId: payload.orderId,
    isMock: true,
  };
}

/**
 * Verifikasi signature key dari notifikasi Midtrans secara timing-safe
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  signatureKey: string
): boolean {
  const config = getMidtransConfig();
  const rawGross =
    typeof grossAmount === "number" ? grossAmount.toFixed(2) : grossAmount;

  // Midtrans kadang mengirim gross_amount dengan .00 atau integer
  // Cek kedua format bila format floating-point berbeda
  const variations = [
    String(grossAmount),
    rawGross,
    parseInt(String(grossAmount), 10).toString() + ".00",
  ];

  for (const gross of variations) {
    const expectedHash = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${gross}${config.serverKey}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHash, "utf-8");
    const actualBuf = Buffer.from(signatureKey, "utf-8");

    if (
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Menghasilkan signature key SHA512 untuk keperluan testing & simulasi
 */
export function generateTestMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string
): string {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}
