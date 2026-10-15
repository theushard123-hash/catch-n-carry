import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const label = visible ? "Ocultar senha" : "Mostrar senha";
    return (
      <div className="relative">
        <Input {...props} ref={ref} disabled={disabled} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground" disabled={disabled} onClick={() => setVisible((current) => !current)} aria-label={label} aria-pressed={visible} title={label}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";