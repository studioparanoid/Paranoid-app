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
            dark: "#0b0b0b",
            light: "#f2f1ec",
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
    <div className="scale-in rounded-lg border border-zinc-800 bg-[#f2f1ec] p-4 text-black">
      <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-zinc-700">
        {label}
      </p>

      {qrCodeUrl ? (
        <Image
          src={qrCodeUrl}
          alt={`QR code ${value}`}
          width={224}
          height={224}
          unoptimized
          className="mx-auto mt-4 h-56 w-56 rounded-2xl"
        />
      ) : (
        <div className="skeleton-shimmer mt-4 flex h-56 items-center justify-center rounded-2xl border border-zinc-300">
          <p className="text-sm font-black text-zinc-500">QR indisponível</p>
        </div>
      )}

      <p className="mt-4 text-center text-3xl font-black tracking-widest">
        {value}
      </p>
    </div>
  );
}
