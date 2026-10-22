import type { Metadata } from "next";
import Link from "next/link";
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
          <p>Drill Hub · Videos are embedded from their original creators — please support them on their channels.</p>
          <p className="mt-2 space-x-4">
            <Link href="/terms" className="hover:text-brand-700">Terms</Link>
            <Link href="/privacy" className="hover:text-brand-700">Privacy</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
