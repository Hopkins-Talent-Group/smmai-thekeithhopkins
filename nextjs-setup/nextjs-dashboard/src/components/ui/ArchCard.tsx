"use client";

import { useEffect, useRef } from "react";

/** ArchCard — UI primitive with border-glow effect.
 *  Used in the architecture and security grids.
 *  Border glow: pointer-tracking conic-gradient lamp (horizonx.so/tools/border-glow).
 *  R-13: border glow applied to arch cards only. prefers-reduced-motion: no JS listener.
 */
interface ArchCardProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  revealDelay?: 0 | 1 | 2 | 3;
  style?: React.CSSProperties;
}

export default function ArchCard({
  children,
  className = "",
  ariaLabel,
  revealDelay,
  style,
}: ArchCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    const card = cardRef.current;
    const layer = layerRef.current;
    if (!card || !layer) return;

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      layer.style.setProperty("--bg-angle", angle.toFixed(1) + "deg");
    };

    const onLeave = () => {
      layer.style.removeProperty("--bg-angle");
    };

    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <article
      ref={cardRef}
      className={`card ${className}`.trim()}
      aria-label={ariaLabel}
      data-reveal
      data-delay={revealDelay ?? undefined}
      style={style}
    >
      <div className="border-glow-layer" aria-hidden="true" ref={layerRef} />
      <div className="border-glow-inner" aria-hidden="true" />
      {children}
    </article>
  );
}
