import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "md",
  light = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  light?: boolean;
}) {
  const img = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img src={logoMark} alt="Trapiche Pescados" className={cn(img, "rounded-full shadow-soft")} />
      <span className={cn("font-display font-bold leading-none tracking-tight", text)}>
        <span className={light ? "text-primary-foreground" : "text-primary"}>Trapiche</span>{" "}
        <span className={light ? "text-aqua" : "text-ocean"}>Pescados</span>
      </span>
    </span>
  );
}
