import type { ManualMethod } from "./types";

/** A Bangladeshi mobile number as 01XXXXXXXXX, or null if it isn't one. Accepts +880 / 880 prefixes and spaces or dashes. */
export function normalizeBdMobile(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const m = /^(?:\+?88)?(01[3-9]\d{8})$/.exec(digits);
  return m ? m[1] : null;
}

const WALLET_TRX = /^[A-Z0-9]{8,14}$/;
const BANK_REF = /^[A-Z0-9][A-Z0-9\-/ ]{3,39}$/;

/** Upper-cases and trims a transaction ID; returns null if it doesn't look like one for this method. */
export function normalizeTransactionId(method: ManualMethod, input: string): string | null {
  const value = input.trim().toUpperCase().replace(/\s+/g, method === "BANK_TRANSFER" ? " " : "");
  const pattern = method === "BANK_TRANSFER" ? BANK_REF : WALLET_TRX;
  return pattern.test(value) ? value : null;
}

export const TRANSACTION_ID_HINT: Record<ManualMethod, string> = {
  BKASH: "The TrxID in your bKash confirmation message, for example 8N7A5B3C2D (8 to 14 letters and numbers).",
  NAGAD: "The Transaction ID in your Nagad confirmation message (8 to 14 letters and numbers).",
  ROCKET: "The TxnID in your Rocket confirmation message (8 to 14 letters and numbers).",
  BANK_TRANSFER: "The reference number on your bank transfer slip or receipt.",
};

/**
 * A wallet number for the method: 01XXXXXXXXX for bKash and Nagad; Rocket accounts are the mobile number
 * plus one extra digit (12 digits), so it also accepts that.
 */
export function normalizeWalletNumber(method: ManualMethod, input: string): string | null {
  if (method !== "ROCKET") return normalizeBdMobile(input);
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+?88/, "");
  return /^01[3-9]\d{8,9}$/.test(digits) ? digits : null;
}
