import { formatMoney, normalizeOrderId, type ShopOrder } from "@/lib/shop";

export type ShopEmailType =
  | "order_created"
  | "payment_confirmed"
  | "order_shipped"
  | "order_completed"
  | "seller_paid_order"
  | "internal_new_order";

export type ShopEmailResult = {
  type: ShopEmailType;
  recipient: string;
  subject: string;
  status: "sent" | "pending" | "failed";
  errorMessage: string | null;
};

function getFromAddress() {
  return process.env.SHOP_EMAIL_FROM || "info@paranoid.pt";
}

function getFromName() {
  return process.env.SHOP_EMAIL_FROM_NAME || "Paranoid";
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  );
}

function summarizeItems(order: ShopOrder) {
  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.productName} — ${formatMoney(
          item.finalPriceCents * item.quantity
        )}`
    )
    .join("\n");
}

function summarizePartnerPayout(order: ShopOrder) {
  const total = order.items.reduce(
    (value, item) => value + item.partnerPayoutAmountCents,
    0
  );

  if (total <= 0) {
    return "Sem payout de parceiro nesta encomenda.";
  }

  return [
    `Payout devido a parceiro: ${formatMoney(total)}`,
    "Atenção: só pagar após documento fiscal aprovado.",
  ].join("\n");
}

async function sendShopEmail(
  type: ShopEmailType,
  recipient: string,
  subject: string,
  body: string
): Promise<ShopEmailResult> {
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[shop-email:pending]", {
        type,
        recipient,
        from: `${getFromName()} <${getFromAddress()}>`,
        subject,
        body,
      });
    }

    return {
      type,
      recipient,
      subject,
      status: "pending",
      errorMessage: "SMTP não configurado.",
    };
  }

  // TODO: ligar a Nodemailer ou ao provider transacional escolhido.
  // As credenciais devem vir sempre de SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASSWORD.
  return {
    type,
    recipient,
    subject,
    status: "pending",
    errorMessage: "Transport SMTP preparado, provider ainda não ligado.",
  };
}

export async function buildOrderCreatedEmails(order: ShopOrder) {
  const orderNumber = normalizeOrderId(order.id);
  const customerBody = [
    `Olá ${order.buyerName},`,
    "",
    `Recebemos a tua encomenda #${orderNumber}.`,
    "",
    summarizeItems(order),
    "",
    `Total: ${formatMoney(order.totalCents)}`,
    "Estado atual: pagamento pendente.",
    "",
    "Recebemos a tua encomenda. Assim que o pagamento for confirmado, enviamos nova atualização.",
  ].join("\n");
  const internalBody = [
    `Nova encomenda #${orderNumber}`,
    `Cliente: ${order.buyerName} <${order.buyerEmail}>`,
    "",
    summarizeItems(order),
    "",
    `Total: ${formatMoney(order.totalCents)}`,
    `IVA estimado: ${formatMoney(order.vatTotalCents)}`,
    summarizePartnerPayout(order),
    `Estado: ${order.orderStatus}`,
  ].join("\n");

  return [
    await sendShopEmail(
      "order_created",
      order.buyerEmail,
      "Recebemos a tua encomenda — Paranoid",
      customerBody
    ),
    await sendShopEmail(
      "internal_new_order",
      getFromAddress(),
      "Nova encomenda na loja — Paranoid",
      internalBody
    ),
  ];
}

export async function buildPaymentConfirmedEmails(order: ShopOrder) {
  const orderNumber = normalizeOrderId(order.id);

  return [
    await sendShopEmail(
      "payment_confirmed",
      order.buyerEmail,
      "Pagamento confirmado — Paranoid",
      `Encomenda #${orderNumber}\n\nO pagamento foi confirmado. A encomenda está agora a ser preparada.`
    ),
  ];
}

export async function buildSellerPaidOrderEmails(
  order: ShopOrder,
  recipientBySellerId: Map<string, string> = new Map()
) {
  const orderNumber = normalizeOrderId(order.id);
  const sellerGroups = new Map<
    string,
    { name: string; lines: string[]; total: number }
  >();

  order.items.forEach((item) => {
    if (item.partnerPayoutAmountCents <= 0) {
      return;
    }

    const key = item.sellerId || item.sellerName || "seller";
    const current = sellerGroups.get(key) || {
      name: item.sellerName || "Artista Paranoid",
      lines: [],
      total: 0,
    };

    current.lines.push(`${item.quantity}x ${item.productName}`);
    current.total += item.payoutAmountCents;
    sellerGroups.set(key, current);
  });

  const results: ShopEmailResult[] = [];

  for (const seller of sellerGroups.values()) {
    const sellerId = Array.from(sellerGroups.entries()).find(
      ([, value]) => value === seller
    )?.[0];

    results.push(
      await sendShopEmail(
        "seller_paid_order",
        (sellerId && recipientBySellerId.get(sellerId)) || getFromAddress(),
        "Nova encomenda para preparar — Paranoid",
        [
          `Olá ${seller.name},`,
          "",
          `Tens uma venda gerida pela Paranoid (#${orderNumber}).`,
          "",
          seller.lines.join("\n"),
          "",
          `Valor previsto a receber: ${formatMoney(seller.total)}`,
          "",
          "O pagamento será processado após validação do documento fiscal.",
        ].join("\n")
      )
    );
  }

  return results;
}

export async function buildShippedEmails(order: ShopOrder, trackingCode = "") {
  const orderNumber = normalizeOrderId(order.id);
  const trackingLine = trackingCode ? `Tracking CTT: ${trackingCode}` : "";

  return [
    await sendShopEmail(
      "order_shipped",
      order.buyerEmail,
      "A tua encomenda foi enviada — Paranoid",
      `Encomenda #${orderNumber}\nTransportadora: CTT\n${trackingLine}\n\nA tua encomenda já foi enviada.`
    ),
  ];
}

export async function buildCompletedEmails(order: ShopOrder) {
  const orderNumber = normalizeOrderId(order.id);

  return [
    await sendShopEmail(
      "order_completed",
      order.buyerEmail,
      "Encomenda concluída — Paranoid",
      `Encomenda #${orderNumber}\n\nObrigado por apoiares cultura independente através da Paranoid.`
    ),
  ];
}
