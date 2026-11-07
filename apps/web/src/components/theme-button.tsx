"use client";
import { Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function ThemeButton() {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Toggle theme"
      onClick={() => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        document.cookie = `friday-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }}
    >
      <Moon className="theme-moon" size={19} aria-hidden="true" />
      <Sun className="theme-sun" size={19} aria-hidden="true" />
    </button>
  );
}
export function PublicTools() {
  const pathname = usePathname();
  if (
    pathname === "/preview" ||
    pathname.startsWith("/preview/") ||
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    (pathname.startsWith("/admin") && pathname !== "/admin/login")
  )
    return null;
  return (
    <header className="topbar">
      <div className="top-actions">
        <ThemeButton />
        <Link className="icon-btn" href="/login" aria-label="Personal profile">
          <UserRound size={19} />
        </Link>
      </div>
    </header>
  );
}
