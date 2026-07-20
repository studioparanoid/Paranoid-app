const resendApiUrl = "https://api.resend.com/emails";

function getFromAddress() {
  return process.env.EMAIL_FROM || "Paranoid <info@paranoid.pt>";
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não está configurada.");

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: from || getFromAddress(), to, subject, html, text }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Não foi possível enviar o email.");
  }
}
