"use client";

import { useEffect, useRef } from "react";

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return match ? `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}` : "220,38,38";
}

export function HubGlobe({ accelerated = false, className = "" }: { accelerated?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const acceleratedRef = useRef(accelerated);

  useEffect(() => {
    acceleratedRef.current = accelerated;
  }, [accelerated]);

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

    const count = 320;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const points = Array.from({ length: count }, (_, index) => {
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * index;
      return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
    });

    let angle = 0;
    let speed = 0.0032;
    let raf = 0;

    function draw() {
      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.42;
      const targetSpeed = acceleratedRef.current ? 0.05 : 0.0032;
      speed += (targetSpeed - speed) * 0.04;
      if (!reduceMotion) angle += speed;

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
          const scale = 300 / (300 - z2 * R);
          return { sx: cx + x1 * R * scale, sy: cy + y1 * R * scale, z: z2 };
        })
        .sort((first, second) => first.z - second.z);

      ctx!.strokeStyle = `rgba(${accentRgb},0.08)`;
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
        const alpha = 0.22 + depth * 0.72;
        ctx!.fillStyle = isAccent ? `rgba(${accentRgb},${alpha})` : `rgba(242,241,236,${alpha * 0.55})`;
        const size = 0.8 + depth * 1.8;
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx!.fill();
      });

      if (document.visibilityState === "visible" && !reduceMotion) raf = requestAnimationFrame(draw);
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
