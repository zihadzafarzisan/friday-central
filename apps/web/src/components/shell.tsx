"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Bell,
  GraduationCap,
  Compass,
  ClipboardList,
  CheckSquare,
  Sparkles,
  UserRound,
  PanelLeftClose,
  LayoutDashboard,
  Settings,
  Users,
  BookOpen,
  ScrollText,
  ChartNoAxesCombined,
} from "lucide-react";
import { signOut } from "@/server/actions";
import { ThemeButton } from "@/components/theme-button";
const studentItems = [
  ["", "Dashboard", LayoutDashboard],
  ["schedule", "Schedule", CalendarDays],
  ["connect", "Connect data", BookOpen],
  ["deadlines", "Deadlines", Clock],
  ["notices", "Notices", Bell],
  ["degree", "Degree progress", GraduationCap],
  ["registration", "Registration Copilot", Compass],
  ["planner", "Semester planner", ClipboardList],
  ["attendance", "Attendance", CheckSquare],
  ["assistant", "Assistant", Sparkles],
  ["notifications", "Notifications", Bell],
  ["profile", "Profile", UserRound],
  ["settings", "Settings", Settings],
] as const;
const adminItems = [
  ["", "Dashboard", LayoutDashboard],
  ["users", "Users", Users],
  ["catalog/programs", "Programs", GraduationCap],
  ["catalog/courses", "Courses", BookOpen],
  ["catalog/sections", "Sections", CalendarDays],
  ["catalog/import", "Import", ClipboardList],
  ["notices", "Notices", Bell],
  ["deadlines", "Deadlines", Clock],
  ["reports", "Reports", ChartNoAxesCombined],
  ["audit-log", "Audit log", ScrollText],
  ["settings", "Settings", Settings],
] as const;
export function Shell({
  children,
  admin = false,
  preview = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
  preview?: boolean;
  initialTheme?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const base = preview ? (admin ? "/preview/admin" : "/preview") : admin ? "/admin" : "/app";
  const items = admin ? adminItems : studentItems;
  return (
    <div className="portal-shell react-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        aria-label={admin ? "Admin navigation" : "Student navigation"}
      >
        <Link className="logo-slot" href="/" aria-label="FRIDAY home">
          <Image
            src="/assets/black.png"
            alt="FRIDAY"
            width={145}
            height={42}
            unoptimized
            className="sidebar-logo-img"
          />
        </Link>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {items.map(([route, label, Icon]) => {
              const href = base + (route ? "/" + route : "");
              return (
                <li className="nav-item" key={route}>
                  <Link
                    className="nav-button"
                    href={href}
                    title={label}
                    aria-label={label}
                    aria-current={pathname === href ? "page" : undefined}
                  >
                    <span className="nav-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          className="collapse-toggle"
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          aria-expanded={!collapsed}
          onClick={(event) => {
            setCollapsed(!collapsed);
            if (event.detail) event.currentTarget.blur();
          }}
        >
          <PanelLeftClose size={18} />
        </button>
      </aside>
      <header className="topbar">
        <div className="top-actions">
          <ThemeButton />
          <Link
            className="icon-btn"
            href={preview ? "/login" : base + (admin ? "/settings" : "/profile")}
            aria-label="Personal profile"
          >
            <UserRound size={19} />
          </Link>
          {!preview && (
            <form action={signOut}>
              <button className="action-button" type="submit">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="workspace" id="main-content" tabIndex={-1}>
        {preview && (
          <div className="demo-banner preview-banner">
            ◌ Preview · sample records · changes reset on reload. <Link href="/login">Sign in</Link>
            <span className="preview-switch">
              <Link href={admin ? "/preview" : "/preview/admin"}>
                {admin ? "Student preview" : "Admin preview"}
              </Link>
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
