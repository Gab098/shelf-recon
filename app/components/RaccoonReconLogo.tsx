import { useId } from "react";

export type RaccoonReconLogoProps = {
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Shelf Recon mascot: a clever raccoon with a cyberpunk green recon visor.
 * Inline SVG so we can animate/glow with CSS (Tailwind + custom theme).
 */
export function RaccoonReconLogo({
  size = 44,
  title = "Shelf Recon",
  className,
}: RaccoonReconLogoProps) {
  const gid = useId().replace(/:/g, "");
  const grad = `srVisorGrad_${gid}`;
  const glow = `srGlow_${gid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#00FF88" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#00FF88" stopOpacity="0.95" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.55" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              0 0 0 0 0
              0 0 0 0 1
              0 0 0 0 0.55
              0 0 0 0.75 0"
            result="greenGlow"
          />
          <feMerge>
            <feMergeNode in="greenGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ears */}
      <path d="M14 22 L20 10 L28 22 Z" fill="#2A2A3A" />
      <path d="M50 22 L44 10 L36 22 Z" fill="#2A2A3A" />

      {/* Head */}
      <circle cx="32" cy="34" r="22" fill="#2F2F44" />

      {/* Face mask */}
      <path
        d="M14 34c3-7 9-12 18-12s15 5 18 12c-4 6-10 10-18 10S18 40 14 34z"
        fill="#1C1C2B"
        opacity="0.95"
      />

      {/* Eyes */}
      <circle cx="24.5" cy="34" r="2.3" fill="#E9E9FF" opacity="0.9" />
      <circle cx="39.5" cy="34" r="2.3" fill="#E9E9FF" opacity="0.9" />
      <circle cx="25.3" cy="33.5" r="0.8" fill="#0F0F1A" />
      <circle cx="40.3" cy="33.5" r="0.8" fill="#0F0F1A" />

      {/* Snout */}
      <path
        d="M28 44c1.5 2 3.2 3 4 3s2.5-1 4-3c-2.2-1.3-5.8-1.3-8 0z"
        fill="#D6D6F2"
        opacity="0.9"
      />
      <circle cx="32" cy="44.5" r="1.1" fill="#1A1A2E" opacity="0.95" />

      {/* Recon visor band */}
      <g filter={`url(#${glow})`}>
        <path
          d="M10 26c6-8 14-12 22-12s16 4 22 12"
          fill="none"
          stroke="#141424"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M12 26c6.5-7 13.5-10.5 20-10.5S45.5 19 52 26"
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* Little scanning tick */}
        <path d="M40 18.3l2.2-1.8" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

