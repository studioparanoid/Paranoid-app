"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import * as QRCode from "qrcode";

type TicketQrCodeProps = {
  value: string;
  label?: string;
};

export function TicketQrCode({ value, label = "Código de entrada" }: TicketQrCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function generateQrCode() {
      try {
        const url = await QRCode.toDataURL(value, {
          width: 280,
          margin: 1,
          color: {
            dark: "#121212",
            light: "#ffffff",
          },
        });

        if (active) {
          setQrCodeUrl(url);
        }
      } catch {
        if (active) {
          setQrCodeUrl("");
        }
      }
    }

    generateQrCode();

    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div className="scale-in rounded-xl border border-black/10 bg-white p-6 text-[#121212] shadow-[0_1px_2px_rgb(0_0_0_/_0.06)]">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#5e5e5e]">
        {label}
      </p>

      {qrCodeUrl ? (
        <Image
          src={qrCodeUrl}
          alt={`QR code ${value}`}
          width={224}
          height={224}
          unoptimized
          className="mx-auto mt-5 h-56 w-56 rounded-xl"
        />
      ) : (
        <div className="skeleton-shimmer mt-5 flex h-56 items-center justify-center rounded-xl border border-black/10">
          <p className="text-sm font-semibold text-[#5e5e5e]">QR indisponível</p>
        </div>
      )}

      <p className="mt-5 text-center text-3xl font-bold tracking-widest">
        {value}
      </p>
    </div>
  );
}
