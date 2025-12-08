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
      {/* סטייל פנימי רק לקו הדופק + אנימציה */}
      <style>{`
        .medtau-ecg {
          stroke-width: 3;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: medtau-ecg-draw 1.6s linear infinite;
        }

        /* יותר איטי בדארק מוד */
        html.dark .medtau-ecg {
          animation-duration: 2.6s;
        }

        @keyframes medtau-ecg-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>



      {/* קו דופק */}
      <polyline
        className="medtau-ecg stroke-blue-300 dark:stroke-sky-400"
        points="70,30 90,30 100,8 115,52 130,15 145,30 175,30"
      />

      {/* TAU */}
      <text
        x="180"
        y="40"
        fontSize="26"
        className="medtau-text font-semibold fill-slate-900 dark:fill-white"
      >
        MedTAU
      </text>
    </svg>
  );
}
