// Runtime-agnostic (Edge + Node) helper: no Node-only imports, so this can be
// used from both middleware (src/proxy.ts, Edge runtime) and API routes.

export const mfaCookieName = "paranoid_mfa_ok";

export async function computeMfaCookieValue(userId: string) {
  const secret = process.env.MFA_COOKIE_SECRET || "";
  const data = new TextEncoder().encode(`${userId}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
