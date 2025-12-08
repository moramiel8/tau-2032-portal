// client/src/components/MedTauLogo.tsx
type MedTauLogoProps = {
  size?: number;
};

export default function MedTauLogo({ size = 220 }: MedTauLogoProps) {
  return (
    <svg
      width={size}
      height={(size * 60) / 220}
      viewBox="0 0 220 60"
      style={{ display: "block" }}
    >
      {/* רק האנימציה והמהירות, בלי צבעים */}
      <style>{`
        :root {
          --ecg-duration: 1.6s;
        }

        html.dark {
          --ecg-duration: 2.6s;
        }

        @keyframes ecg-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      {/* Med */}
      <text
        x="0"
        y="40"
        fontSize="26"
        className="font-semibold fill-slate-900 dark:fill-white"
      >
        Med
      </text>

      {/* קו דופק */}
      <polyline
        points="70,30 90,30 100,8 115,52 130,15 145,30 175,30"
        className="stroke-blue-600 dark:stroke-sky-400"
        style={{
          strokeWidth: 3,
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeDasharray: 120,
          strokeDashoffset: 120,
          animation: "ecg-draw var(--ecg-duration) linear infinite",
        }}
      />

      {/* TAU */}
      <text
        x="180"
        y="40"
        fontSize="26"
        className="font-semibold fill-slate-900 dark:fill-white"
      >
        TAU
      </text>
    </svg>
  );
}
