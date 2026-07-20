import { createHash, randomInt } from "crypto";

export type EmailMfaPurpose = "enroll" | "login";

export const emailMfaCodeTtlMs = 10 * 60 * 1000;
export const emailMfaResendCooldownMs = 60 * 1000;
export const emailMfaMaxAttempts = 5;

export function parseEmailMfaPurpose(value: unknown): EmailMfaPurpose | null {
  return value === "enroll" || value === "login" ? value : null;
}

export function generateEmailMfaCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashEmailMfaCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function buildEmailMfaMessage(code: string) {
  return {
    subject: "O teu código de verificação — Paranoid",
    text: `O teu código de verificação Paranoid é ${code}. Expira em 10 minutos. Se não pediste este código, ignora este email.`,
    html: `<div style="font-family:sans-serif;color:#111;">
      <p>O teu código de verificação Paranoid é:</p>
      <p style="font-size:28px;font-weight:900;letter-spacing:0.12em;">${code}</p>
      <p style="color:#666;font-size:13px;">Expira em 10 minutos. Se não pediste este código, ignora este email.</p>
    </div>`,
  };
}
