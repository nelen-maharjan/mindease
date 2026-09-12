"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/index";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Mood tracker", href: "/mood", icon: "◕" },
  { label: "Journal", href: "/journal", icon: "✎" },
  { label: "AI assistant", href: "/chat", icon: "◎" },
];

const wellnessItems = [
  { label: "Habits", href: "/habits", icon: "↻" },
  { label: "Goals", href: "/goals", icon: "◎" },
  { label: "Recommendations", href: "/recommendations", icon: "✦" },
];

const insightItems = [
  { label: "Analytics", href: "/analytics", icon: "↗" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

const adminItems = [
  { label: "Admin", href: "/admin", icon: "▣" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = (user as { role?: string } | undefined)?.role === "ADMIN";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Ignore signOut errors if session expired
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen bg-card border-r border-border sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              M
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">MindEase</p>
              <p className="text-[10px] text-muted-foreground">Wellness companion</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <NavSection label="Main" items={navItems} pathname={pathname} />
        <NavSection label="Wellness" items={wellnessItems} pathname={pathname} />
        <NavSection label="Insights" items={insightItems} pathname={pathname} />
        {isAdmin && <NavSection label="Platform" items={adminItems} pathname={pathname} />}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[11px] bg-gradient-to-br from-indigo-100 to-teal-100 text-indigo-700 font-semibold">
                {user?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, items, pathname }: {
  label: string;
  items: { label: string; href: string; icon: string }[];
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="text-base leading-none w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
