import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, LayoutGrid, LogOut, PackagePlus, Settings, ShieldCheck } from "lucide-react";
import { GearUpLogo } from "@/components/GearUpLogo";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";
import { useT } from "@/lib/settings";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "nav.companies", icon: LayoutGrid },
  { to: "/equipement", key: "nav.inventory", icon: Boxes },
  { to: "/kits", key: "nav.kits", icon: PackagePlus },
  { to: "/parametres", key: "nav.settings", icon: Settings },
] as const;



export function AppShell({
  children,
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const isSuper = useIsSuperAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-tint-4 text-brand-foreground shadow-glow">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">GearUp</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname.startsWith(item.to) && "bg-brand-soft text-brand",
                )}
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{t(item.key)}</span>
              </Link>
            ))}
            {isSuper ? (
              <Link
                to="/super-admin"
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-tint-6 transition-colors hover:bg-accent",
                  pathname.startsWith("/super-admin") && "bg-tint-6-soft",
                )}
              >
                <ShieldCheck className="size-4" />
                <span className="hidden sm:inline">Super admin</span>
              </Link>
            ) : null}
          </nav>

          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t("nav.signout")}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {breadcrumb ? <div className="mb-3 text-sm text-muted-foreground">{breadcrumb}</div> : null}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
