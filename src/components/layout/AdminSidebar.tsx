import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut, LucideIcon, Store } from "lucide-react";
import { ComponentProps } from "react";
import navMenu from "@/lib/navmenu.json";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type IconName = keyof typeof LucideIcons;

type DynamicIconProps = {
  name: IconName;
} & ComponentProps<LucideIcon>;

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon = LucideIcons[name] as LucideIcon;
  if (!Icon) return <LucideIcons.HelpCircle {...props} />;
  return <Icon {...props} />;
};

// ─── Plan badge colours ────────────────────────────────────────────────────────
const planStyles: Record<string, string> = {
  starter: "bg-zinc-500/20 text-zinc-300",
  growth:  "bg-blue-500/20  text-blue-300",
  pro:     "bg-amber-500/20 text-amber-300",
};

interface ShopInfo {
  name: string;
  shop_code: string;
  current_plan: string | null;
}

interface AdminSidebarProps {
  onSignOut: () => void;
}

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const location = useLocation();

  // Fetch the shop that belongs to the current authenticated user
  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("shops")
        .select("name, shop_code, current_plan")
        .eq("owner_id", user.id)
        .single();

      if (!cancelled && data) setShop(data as ShopInfo);
    }

    loadShop();
    return () => { cancelled = true; };
  }, []);

  // Truncate long shop names gracefully
  function truncate(str: string, max: number) {
    return str.length > max ? str.slice(0, max).trimEnd() + "…" : str;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-sidebar-primary truncate pr-2">
            Dhaka Fashion House Admin
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Shop Info Card ───────────────────────────────────────────────────── */}
      {shop && (
        <div
          className={cn(
            "mx-2 mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 transition-all duration-200",
            collapsed ? "px-2 py-2 flex justify-center" : "px-3 py-2.5"
          )}
        >
          {collapsed ? (
            /* Collapsed: just the store icon */
            <Store className="h-5 w-5 text-sidebar-primary shrink-0" />
          ) : (
            /* Expanded: name + code + plan */
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Store className="h-4 w-4 text-sidebar-primary shrink-0" />
                <span
                  className="text-sm font-semibold text-sidebar-foreground truncate leading-tight"
                  title={shop.name}
                >
                  {truncate(shop.name, 18)}
                </span>
              </div>

              <p className="text-xs font-mono text-sidebar-foreground/60 pl-0.5 tracking-wide">
                {shop.shop_code}
              </p>

              {shop.current_plan && (
                <span
                  className={cn(
                    "inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                    planStyles[shop.current_plan] ?? "bg-sidebar-accent text-sidebar-foreground"
                  )}
                >
                  {shop.current_plan}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navMenu.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <DynamicIcon
                name={item.icon as IconName}
                className="h-5 w-5 shrink-0"
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Sign Out ─────────────────────────────────────────────────────────── */}
      <div className="px-2 pb-4 shrink-0">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium w-full hover:bg-sidebar-accent/50 text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}