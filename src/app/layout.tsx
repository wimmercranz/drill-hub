import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Drill Hub", template: "%s · Drill Hub" },
  description: "Discover, collect and plan drills for your team.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-slate-200 bg-white py-6 text-center text-xs text-ink-500">
          Drill Hub · Videos are embedded from their original creators — please support them on their channels.
        </footer>
      </body>
    </html>
  );
}
