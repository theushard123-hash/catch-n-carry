import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Package, ShoppingBasket, User, Shield, ShoppingCart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { CUSTOMER_TYPE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/catalogo", label: "Catálogo", icon: ShoppingBasket },
  { to: "/carrinho", label: "Meu carrinho", icon: ShoppingCart },
  { to: "/pedidos", label: "Meus pedidos", icon: Package },
  { to: "/perfil", label: "Meu cadastro", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background bg-waves">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/catalogo" className="shrink-0">
            <BrandLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                <span className="inline-flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Administração
                </span>
              </Link>
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {profile && (
              <div className="text-right leading-tight">
                <p className="max-w-[180px] truncate text-sm font-semibold">
                  {profile.company_name || profile.full_name || "Cliente"}
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <Badge variant="aqua" className="px-2 py-0 text-[10px]">
                    {CUSTOMER_TYPE_LABEL[profile.customer_type]}
                  </Badge>
                  {profile.customer_type === "atacado" && !profile.approved && (
                    <Badge variant="warning" className="px-2 py-0 text-[10px]">
                      Aguardando aprovação
                    </Badge>
                  )}

                </div>
              </div>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut />
            </Button>
          </div>

          <div className="flex items-center md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <Menu />
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-card md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 p-3">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-primary" }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-primary" }}
                >
                  <Shield className="h-4 w-4" />
                  Administração
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10",
                )}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
