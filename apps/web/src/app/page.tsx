import Link from "next/link";
import { CalendarDays, Clock, Bell, GraduationCap } from "lucide-react";
import Image from "next/image";
export default function Landing() {
  return (
    <div className="portal-shell landing-shell">
      <header className="landing-top">
        <Link className="wordmark" href="/">
          FRIDAY
        </Link>
      </header>
      <main className="main-content landing-content">
        <section className="hero-container">
          <span className="welcome-pill">Welcome to FRIDAY · BRACU</span>
          <h1 className="brand-title">
            <Image
              src="/assets/black.png"
              alt="FRIDAY"
              width={440}
              height={140}
              unoptimized
              className="hero-logo-img"
            />
          </h1>
          <p className="hero-description">
            Your personalised portal to plan courses, track deadlines, and manage academic life in
            one place.
          </p>
          <div className="quote-pill">Your future self is counting on what you do today.</div>
          <div className="hero-actions">
            <Link className="btn-primary" href="/schedules">
              Open schedules →
            </Link>
            <Link className="btn-secondary" href="/app">
              Open portal
            </Link>
          </div>
          <div className="quick-chips">
            {[
              ["/preview/planner", "Planner", CalendarDays],
              ["/preview/deadlines", "Deadlines", Clock],
              ["/preview/notices", "Notices", Bell],
              ["/preview/degree", "Degree tracker", GraduationCap],
            ].map(([href, label, Icon]) => (
              <Link className="quick-chip" href={href as string} key={href as string}>
                {typeof Icon !== "string" && <Icon size={16} />}
                {label as string}
              </Link>
            ))}
          </div>
          <p className="muted landing-preview">
            <Link href="/signup">Create your BRACU account</Link> ·{" "}
            <Link href="/preview">Explore every page</Link>
          </p>
        </section>
        <footer className="landing-footer">
          {[
            ["about", "About"],
            ["privacy", "Privacy"],
            ["terms", "Terms"],
            ["support", "Support"],
            ["community", "Community"],
          ].map(([route, label]) => (
            <Link href={`/${route}`} key={route}>
              {label}
            </Link>
          ))}
          <Link href="/admin/login">Admin login</Link>
        </footer>
      </main>
    </div>
  );
}
