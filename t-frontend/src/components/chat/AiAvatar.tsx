"use client";

import { useId } from "react";

export function GeminiAiLogo({ className = "h-7 w-7" }: { className?: string }) {
  const rawId = useId();
  // Sanitize id for SVG url references (React's useId returns strings like ":r1:")
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  const bodyGradId = `gemini-body-${id}`;
  const facetLightId = `gemini-facet-light-${id}`;
  const facetDarkId = `gemini-facet-dark-${id}`;
  const sparkle1LightId = `gemini-sparkle1-light-${id}`;
  const sparkle1DarkId = `gemini-sparkle1-dark-${id}`;
  const sparkle2LightId = `gemini-sparkle2-light-${id}`;
  const sparkle2DarkId = `gemini-sparkle2-dark-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 overflow-visible drop-shadow-[0_0_3px_rgba(16,185,129,0.25)] dark:drop-shadow-[0_0_4px_rgba(16,185,129,0.35)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Main star gradient: luminous mint to deep emerald */}
        <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="40%" stopColor="#10B981" />
          <stop offset="75%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Specular highlight on top-right quadrant - pure white shimmer */}
        <linearGradient id={facetLightId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Deep emerald shadow on bottom-left quadrant */}
        <linearGradient id={facetDarkId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#064E3B" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
        </linearGradient>

        {/* Light mode primary satellite sparkle gradient - luminous mint/emerald */}
        <linearGradient id={sparkle1LightId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="60%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Dark mode primary satellite sparkle gradient - pure white shimmer */}
        <linearGradient id={sparkle1DarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
        </linearGradient>

        {/* Light mode secondary satellite sparkle gradient - soft mint/emerald */}
        <linearGradient id={sparkle2LightId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Dark mode secondary satellite sparkle gradient - pure white shimmer */}
        <linearGradient id={sparkle2DarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <g>
        {/* Main 4-pointed Gemini star body */}
        <path
          d="M 11 3.5 C 11 8.8, 15.2 13, 20.5 13 C 15.2 13, 11 17.2, 11 22.5 C 11 17.2, 6.8 13, 1.5 13 C 6.8 13, 11 8.8, 11 3.5 Z"
          fill={`url(#${bodyGradId})`}
        />

        {/* Top-right specular facet (white/light emerald shimmer) */}
        <path
          d="M 11 3.5 C 11 8.8, 15.2 13, 20.5 13 L 11 13 Z"
          fill={`url(#${facetLightId})`}
        />

        {/* Bottom-left depth facet (forest emerald) */}
        <path
          d="M 11 22.5 C 11 17.2, 6.8 13, 1.5 13 L 11 13 Z"
          fill={`url(#${facetDarkId})`}
        />

        {/* Light mode satellite sparkles (slightly greenish for proper visibility on light backgrounds) */}
        <g className="dark:hidden">
          {/* Satellite Sparkle 1 (Top-Right) */}
          <path
            d="M 19.5 1 C 19.5 2.9, 21.1 4.5, 23 4.5 C 21.1 4.5, 19.5 6.1, 19.5 8 C 19.5 6.1, 17.9 4.5, 16 4.5 C 17.9 4.5, 19.5 2.9, 19.5 1 Z"
            fill={`url(#${sparkle1LightId})`}
          />

          {/* Satellite Sparkle 2 (Top-Left accent) */}
          <path
            d="M 4 2 C 4 3.1, 4.9 4, 6 4 C 4.9 4, 4 4.9, 4 6 C 4 4.9, 3.1 4, 2 4 C 3.1 4, 4 3.1, 4 2 Z"
            fill={`url(#${sparkle2LightId})`}
            opacity="0.95"
          />

          {/* Satellite Sparkle 3 (Bottom-Right micro-sparkle) */}
          <path
            d="M 21 16.5 C 21 17.3, 21.7 18, 22.5 18 C 21.7 18, 21 18.7, 21 19.5 C 21 18.7, 20.3 18, 19.5 18 C 20.3 18, 21 17.3, 21 16.5 Z"
            fill="#10B981"
            opacity="0.95"
          />
        </g>

        {/* Dark mode satellite sparkles (luminous white shimmer on dark background) */}
        <g className="hidden dark:inline">
          {/* Satellite Sparkle 1 (Top-Right) */}
          <path
            d="M 19.5 1 C 19.5 2.9, 21.1 4.5, 23 4.5 C 21.1 4.5, 19.5 6.1, 19.5 8 C 19.5 6.1, 17.9 4.5, 16 4.5 C 17.9 4.5, 19.5 2.9, 19.5 1 Z"
            fill={`url(#${sparkle1DarkId})`}
          />

          {/* Satellite Sparkle 2 (Top-Left accent) */}
          <path
            d="M 4 2 C 4 3.1, 4.9 4, 6 4 C 4.9 4, 4 4.9, 4 6 C 4 4.9, 3.1 4, 2 4 C 3.1 4, 4 3.1, 4 2 Z"
            fill={`url(#${sparkle2DarkId})`}
            opacity="0.9"
          />

          {/* Satellite Sparkle 3 (Bottom-Right micro-sparkle - white) */}
          <path
            d="M 21 16.5 C 21 17.3, 21.7 18, 22.5 18 C 21.7 18, 21 18.7, 21 19.5 C 21 18.7, 20.3 18, 19.5 18 C 20.3 18, 21 17.3, 21 16.5 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * Premium AI logo shown next to every assistant message.
 * No circular border or background; features a multi-shaded Gemini-style green star with slightly greenish satellite sparkles in light mode and glowing white sparkles in dark mode.
 * Hidden on mobile to preserve conversation width.
 */
export default function AiAvatar({ className = "", visible = true }: { className?: string; visible?: boolean }) {
  return (
    <span
      className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center transition-opacity duration-150 ${className} ${visible ? "" : "invisible"}`}
      aria-hidden="true"
    >
      <GeminiAiLogo className="h-7 w-7" />
    </span>
  );
}
