import { useEffect, useState } from "react";

type Phase = "in" | "hold" | "out";

interface Props {
  logoSrc: string;
  onDone: () => void;
}

export function SplashScreen({ logoSrc, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 700);
    const t2 = setTimeout(() => setPhase("out"), 1800);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const isOut = phase === "out";

  return (
    <>
      <style>{`
        @keyframes splash-logo-in {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-logo-pulse {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.18); }
        }
        .splash-logo-in {
          animation: splash-logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .splash-logo-hold {
          opacity: 1;
          transform: scale(1);
          animation: splash-logo-pulse 1.2s ease-in-out infinite;
        }
        .splash-logo-out {
          opacity: 0;
          transform: scale(1.06);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
      `}</style>

      {/* Solid background layer — fades out fast */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "hsl(var(--background))",
          transition: "opacity 0.5s ease",
          opacity: isOut ? 0 : 1,
          pointerEvents: "none",
        }}
      />

      {/* Glassmorphism layer — appears on fade-out, then also disappears */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: isOut ? "blur(28px) saturate(160%)" : "none",
          WebkitBackdropFilter: isOut ? "blur(28px) saturate(160%)" : "none",
          background: isOut
            ? "linear-gradient(135deg, hsl(var(--background) / 0.35) 0%, hsl(var(--primary) / 0.08) 100%)"
            : "transparent",
          borderTop: isOut ? "1px solid hsl(var(--border) / 0.3)" : "none",
          transition: "opacity 0.9s ease, backdrop-filter 0.5s ease, background 0.5s ease",
          opacity: isOut ? 0 : 1,
          pointerEvents: isOut ? "none" : "all",
        }}
      >
        <img
          src={logoSrc}
          alt="Notecoder"
          className={
            phase === "in" ? "splash-logo-in"
            : phase === "out" ? "splash-logo-out"
            : "splash-logo-hold"
          }
          style={{ width: 234, height: "auto" }}
        />
      </div>
    </>
  );
}
