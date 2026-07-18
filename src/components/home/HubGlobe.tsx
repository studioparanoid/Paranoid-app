"use client";

import { useEffect, useRef } from "react";

export type HubGlobeState = "idle" | "thinking" | "navigating";

const speedByState: Record<HubGlobeState, number> = { idle: 0.0032, thinking: 0.014, navigating: 0.052 };
const brightnessByState: Record<HubGlobeState, number> = { idle: 1, thinking: 1.18, navigating: 1.4 };

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return match ? `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}` : "220,38,38";
}

export function HubGlobe({ state = "idle", pulse = 0, className = "" }: { state?: HubGlobeState; pulse?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const pulseUntilRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (pulse > 0) pulseUntilRef.current = performance.now() + 650;
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accentRgb = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#dc2626");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const count = 460;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const points = Array.from({ length: count }, (_, index) => {
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * index;
      return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
    });

    let angle = 0;
    let speed = speedByState.idle;
    let brightness = 1;
    let breathe = 0;
    let raf = 0;

    function draw() {
      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.44;
      const targetSpeed = speedByState[stateRef.current];
      const pulseRemaining = pulseUntilRef.current - performance.now();
      const pulseBoost = pulseRemaining > 0 ? (pulseRemaining / 650) * 0.5 : 0;
      const targetBrightness = brightnessByState[stateRef.current] + pulseBoost;
      speed += (targetSpeed - speed) * 0.05;
      brightness += (targetBrightness - brightness) * 0.12;
      breathe += 0.012;
      if (!reduceMotion) angle += speed;
      const breatheScale = reduceMotion ? 1 : 1 + Math.sin(breathe) * 0.012;

      ctx!.clearRect(0, 0, width, height);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosT = Math.cos(0.4);
      const sinT = Math.sin(0.4);
      const projected = points
        .map((p) => {
          const x1 = p.x * cosA - p.z * sinA;
          const z1 = p.x * sinA + p.z * cosA;
          const y1 = p.y * cosT - z1 * sinT;
          const z2 = p.y * sinT + z1 * cosT;
          const radiusScale = R * breatheScale;
          const scale = 300 / (300 - z2 * radiusScale);
          return { sx: cx + x1 * radiusScale * scale, sy: cy + y1 * radiusScale * scale, z: z2 };
        })
        .sort((first, second) => first.z - second.z);

      ctx!.strokeStyle = `rgba(${accentRgb},${0.07 * brightness})`;
      ctx!.lineWidth = 0.6;
      for (let index = 0; index < projected.length; index += 5) {
        const a = projected[index];
        const b = projected[(index + 9) % projected.length];
        if (a.z > 0 && b.z > 0) {
          ctx!.beginPath();
          ctx!.moveTo(a.sx, a.sy);
          ctx!.lineTo(b.sx, b.sy);
          ctx!.stroke();
        }
      }

      projected.forEach((p) => {
        const depth = (p.z + 1) / 2;
        const isAccent = depth > 0.55;
        const alpha = Math.min(1, (0.2 + depth * 0.72) * brightness);
        ctx!.fillStyle = isAccent ? `rgba(${accentRgb},${alpha})` : `rgba(242,241,236,${alpha * 0.55})`;
        const size = (0.8 + depth * 1.9) * Math.min(1.25, brightness);
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx!.fill();
      });

      if (document.visibilityState === "visible") raf = requestAnimationFrame(draw);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
