import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { PublicTools } from "@/components/theme-button";
export const metadata: Metadata = {
  title: { default: "FRIDAY — Student OS", template: "%s · FRIDAY" },
  description:
    "Your BRAC University student portal for schedules, deadlines, notices, and academic planning.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("friday-theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={theme}>
      <body>
        <PublicTools />
        {children}
      </body>
    </html>
  );
}
