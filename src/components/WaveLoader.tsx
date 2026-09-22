import { Fish } from "lucide-react";

/**
 * WaveLoader — animação de carregamento com o tema da Trapiche (mar/ondas).
 * Peixe flutuando + ondas turquesa se movendo na base da tela.
 */
export function WaveLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-background/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes trapiche-wave-drift {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes trapiche-fish-bob {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        @keyframes trapiche-ring-pulse {
          0% { transform: scale(0.85); opacity: 0.7; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <div className="relative mb-4 flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-aqua/30"
          style={{ animation: "trapiche-ring-pulse 1.8s ease-out infinite" }}
        />
        <span
          className="absolute inset-0 rounded-full bg-aqua/20"
          style={{ animation: "trapiche-ring-pulse 1.8s ease-out 0.6s infinite" }}
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-ocean shadow-lg">
          <Fish
            className="h-8 w-8 text-aqua"
            style={{ animation: "trapiche-fish-bob 1.6s ease-in-out infinite" }}
          />
        </span>
      </div>

      <p className="animate-pulse text-sm font-semibold text-muted-foreground">{label}</p>

      {/* Ondas animadas na base */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 overflow-hidden" aria-hidden>
        <svg
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-full w-[200%] text-aqua/25"
          style={{ animation: "trapiche-wave-drift 9s linear infinite" }}
        >
          <path
            fill="currentColor"
            d="M0,64 C240,96 480,32 720,56 C960,80 1200,112 1440,88 C1680,64 1920,32 2160,56 C2400,80 2640,112 2880,88 L2880,120 L0,120 Z"
          />
        </svg>
        <svg
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-full w-[200%] text-aqua/40"
          style={{ animation: "trapiche-wave-drift 6s linear infinite reverse" }}
        >
          <path
            fill="currentColor"
            d="M0,80 C240,48 480,104 720,80 C960,56 1200,32 1440,64 C1680,96 1920,104 2160,80 C2400,56 2640,40 2880,72 L2880,120 L0,120 Z"
          />
        </svg>
        <svg
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-3/4 w-[200%] text-primary/15"
          style={{ animation: "trapiche-wave-drift 12s linear infinite" }}
        >
          <path
            fill="currentColor"
            d="M0,72 C360,104 720,40 1080,64 C1440,88 1800,104 2160,72 C2520,40 2700,56 2880,72 L2880,120 L0,120 Z"
          />
        </svg>
      </div>
    </div>
  );
}
