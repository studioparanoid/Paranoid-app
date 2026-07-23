"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { supabase } from "@/lib/supabase/public";

type ReservationStatus = "reserved" | "cancelled" | "checked_in";

type ReservationRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  user_email: string | null;
  quantity: number;
  status: ReservationStatus;
  check_in_code: string;
  created_at: string;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
};

type ScanResult = {
  type: "success" | "already" | "cancelled" | "not_found" | "error";
  title: string;
  text: string;
  code: string;
  reservation: ReservationRow | null;
  event: EventRow | null;
};

function statusLabel(status: ReservationStatus) {
  if (status === "reserved") {
    return "Reservado";
  }

  if (status === "checked_in") {
    return "Entrada feita";
  }

  return "Cancelado";
}

function resultClasses(type: ScanResult["type"]) {
  if (type === "success") {
    return "border-green-900 bg-green-950/30 text-green-400";
  }

  if (type === "already") {
    return "border-yellow-900 bg-yellow-950/30 text-yellow-500";
  }

  if (type === "cancelled") {
    return "border-danger bg-danger/30 text-danger";
  }

  if (type === "not_found") {
    return "border-border bg-background text-foreground-muted";
  }

  return "border-danger bg-danger/30 text-danger";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TicketScannerClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const processingRef = useRef(false);

  const [loadingAccount, setLoadingAccount] = useState(true);
  const [email, setEmail] = useState("");

  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    async function loadAccount() {
      setLoadingAccount(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email || "");
      setLoadingAccount(false);
    }

    loadAccount();

    return () => {
      stopScanner();
    };
  }, []);

  function cleanCode(value: string) {
    return value.trim().toUpperCase();
  }

  function stopScanner() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanning(false);
  }

  async function startScanner() {
    setMessage("");
    setLastResult(null);

    if (!email) {
      setMessage("Tens de entrar numa conta de organizador.");
      return;
    }

    if (!videoRef.current) {
      setMessage("Vídeo indisponível.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Este browser não permite usar a câmara aqui.");
      return;
    }

    try {
      setScanning(true);

      const codeReader = new BrowserQRCodeReader();

      const controls = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, controlsFromCallback) => {
          if (!result) {
            return;
          }

          const value = cleanCode(result.getText());

          if (!value || processingRef.current) {
            return;
          }

          controlsFromCallback.stop();
          scannerControlsRef.current = null;
          setScanning(false);

          void processCode(value);
        }
      );

      scannerControlsRef.current = controls;
    } catch (error) {
      setScanning(false);
      setMessage(
        `Erro ao abrir câmara: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  async function getEvent(eventId: string) {
    const { data } = await supabase
      .from("events")
      .select("id,slug,title,city,venue_name,display_date,display_time")
      .eq("id", eventId)
      .maybeSingle();

    return (data || null) as EventRow | null;
  }

  async function processCode(rawCode: string) {
    const code = cleanCode(rawCode);

    setMessage("");
    setLastResult(null);

    if (!code) {
      setMessage("Mete ou lê um código.");
      return;
    }

    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setProcessing(true);

    const { data: reservationData, error: reservationError } = await supabase
      .from("ticket_reservations")
      .select(
        "id,event_id,user_id,user_email,quantity,status,check_in_code,created_at,updated_at"
      )
      .eq("check_in_code", code)
      .maybeSingle();

    if (reservationError) {
      processingRef.current = false;
      setProcessing(false);

      setLastResult({
        type: "error",
        title: "Erro",
        text: reservationError.message,
        code,
        reservation: null,
        event: null,
      });

      return;
    }

    if (!reservationData) {
      processingRef.current = false;
      setProcessing(false);

      setLastResult({
        type: "not_found",
        title: "Código não encontrado",
        text: "Não encontrei este código na bilheteira deste organizador.",
        code,
        reservation: null,
        event: null,
      });

      return;
    }

    const reservation = reservationData as ReservationRow;
    const event = await getEvent(reservation.event_id);

    if (reservation.status === "checked_in") {
      processingRef.current = false;
      setProcessing(false);

      setLastResult({
        type: "already",
        title: "Entrada já feita",
        text: "Este bilhete já foi usado.",
        code,
        reservation,
        event,
      });

      return;
    }

    if (reservation.status === "cancelled") {
      processingRef.current = false;
      setProcessing(false);

      setLastResult({
        type: "cancelled",
        title: "Reserva cancelada",
        text: "Este bilhete está cancelado. Não abrir entrada.",
        code,
        reservation,
        event,
      });

      return;
    }

    const { data: updatedData, error: updateError } = await supabase
      .from("ticket_reservations")
      .update({
        status: "checked_in",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation.id)
      .select(
        "id,event_id,user_id,user_email,quantity,status,check_in_code,created_at,updated_at"
      )
      .single();

    processingRef.current = false;
    setProcessing(false);

    if (updateError) {
      setLastResult({
        type: "error",
        title: "Sem permissão ou erro",
        text: updateError.message,
        code,
        reservation,
        event,
      });

      return;
    }

    setManualCode("");

    setLastResult({
      type: "success",
      title: "Entrada confirmada",
      text: "Check-in feito. Pode entrar.",
      code,
      reservation: updatedData as ReservationRow,
      event,
    });
  }

  if (loadingAccount) {
    return (
      <div className="mt-8 rounded-[2rem] border border-border bg-background p-6">
        <p className="text-foreground-muted">A verificar conta...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-border bg-background p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          Sem sessão
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Tens de entrar.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-foreground-muted">
          O scanner só funciona para contas com permissão para gerir reservas.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-[#f5f5f2] px-6 py-4 text-sm font-black text-black"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <section className="rounded-[2.5rem] border border-border bg-background p-5 lg:sticky lg:top-28 lg:p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          Câmara
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none">
          Scanner QR.
        </h2>

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-border bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
        </div>

        <div className="mt-5 grid gap-3">
          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              disabled={processing}
              className="rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              Abrir scanner
            </button>
          ) : (
            <button
              type="button"
              onClick={stopScanner}
              className="rounded-full border border-danger px-5 py-4 text-sm font-bold text-danger"
            >
              Parar scanner
            </button>
          )}

          <Link
            href="/organizador/bilhetes"
            className="rounded-full border border-border-strong px-5 py-4 text-center text-sm font-bold text-foreground-secondary"
          >
            Ver lista de reservas
          </Link>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-danger bg-danger/20 p-4 text-sm text-danger">
            {message}
          </p>
        )}
      </section>

      <section className="space-y-6">
        <section className="rounded-[2.5rem] border border-border bg-background p-5 lg:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            Manual
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            Inserir código.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
            Se a câmara falhar, mete o código do bilhete manualmente.
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_0.35fr]">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Ex: A1B2C3D4E5"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />

            <button
              type="button"
              onClick={() => processCode(manualCode)}
              disabled={processing}
              className="rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {processing ? "A validar..." : "Validar"}
            </button>
          </div>
        </section>

        {lastResult ? (
          <section
            className={`rounded-[2.5rem] border p-6 lg:p-8 ${resultClasses(
              lastResult.type
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">
              Resultado
            </p>

            <h2 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
              {lastResult.title}
            </h2>

            <p className="mt-4 text-base font-bold opacity-90">
              {lastResult.text}
            </p>

            <div className="mt-6 rounded-[2rem] border border-black/20 bg-black/30 p-5 text-sm text-[#f5f5f2]">
              <p>
                <span className="font-black">Código:</span> {lastResult.code}
              </p>

              {lastResult.reservation && (
                <>
                  <p className="mt-2">
                    <span className="font-black">Estado:</span>{" "}
                    {statusLabel(lastResult.reservation.status)}
                  </p>

                  <p className="mt-2">
                    <span className="font-black">Quantidade:</span>{" "}
                    {lastResult.reservation.quantity}
                  </p>

                  <p className="mt-2">
                    <span className="font-black">Email:</span>{" "}
                    {lastResult.reservation.user_email || "Sem email"}
                  </p>

                  <p className="mt-2">
                    <span className="font-black">Reserva:</span>{" "}
                    {formatDateTime(lastResult.reservation.created_at)}
                  </p>
                </>
              )}

              {lastResult.event && (
                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
                    Evento
                  </p>

                  <h3 className="mt-2 text-2xl font-black">
                    {lastResult.event.title}
                  </h3>

                  <p className="mt-2 text-foreground-muted">
                    {lastResult.event.display_date || "Data por definir"}
                    {lastResult.event.display_time
                      ? ` · ${lastResult.event.display_time}`
                      : ""}
                  </p>

                  <p className="mt-1 text-foreground-muted">
                    {[lastResult.event.venue_name, lastResult.event.city]
                      .filter(Boolean)
                      .join(" · ") || "Local por definir"}
                  </p>

                  <Link
                    href={`/eventos/${lastResult.event.slug}`}
                    className="mt-4 inline-block rounded-full border border-border-strong px-4 py-3 text-sm font-bold text-foreground-secondary"
                  >
                    Ver evento
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={startScanner}
              disabled={processing || scanning}
              className="mt-6 w-full rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              Ler próximo QR
            </button>
          </section>
        ) : (
          <section className="rounded-[2.5rem] border border-border bg-background p-6 lg:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-danger">
              Espera
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
              Ainda nenhum código lido.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
              Abre o scanner ou valida um código manualmente.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}